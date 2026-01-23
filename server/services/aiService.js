/**
 * AI Service - Chutes AI Integration (v2 - Anti-Hallucination)
 *
 * Este servicio encapsula toda la lógica de comunicación con Chutes AI.
 * Implementa:
 * - Prompts anti-alucinación con formato JSON estructurado
 * - Validación de respuestas
 * - Tracking de tokens para control de costos
 */

import OpenAI from 'openai';
import '../config/env.js';

// Import all prompts from consolidated module
import {
  PAGE_ANALYSIS_PROMPT,
  SUMMARY_GENERATION_PROMPT,
  PAGE_ANALYSIS_PROMPT_V2,
  IMRYD_EXTRACTION_PROMPT,
  validateIMRyDResponse
} from '../utils/prompts.js';

// Use v2 prompts if USE_PROMPTS_V2 is set
const USE_V2_PROMPTS = process.env.USE_PROMPTS_V2 === 'true';

// Configuración del cliente Chutes AI
const client = new OpenAI({
  baseURL: 'https://llm.chutes.ai/v1',
  apiKey: process.env.CHUTES_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:5173',
    'X-Title': process.env.SITE_NAME || 'Medical Summarizer'
  }
});

// Token tracking for cost estimation
let sessionTokens = {
  prompt: 0,
  completion: 0,
  total: 0
};

/**
 * Estimate tokens in a string (rough approximation)
 * @param {string} text - Text to estimate
 * @returns {number} - Estimated token count
 */
function estimateTokens(text) {
  if (!text) return 0;
  // Rough estimate: ~4 characters per token for English/Spanish
  return Math.ceil(text.length / 4);
}

/**
 * Update token tracking from API response
 * @param {Object} usage - Usage object from API response
 */
function trackTokenUsage(usage) {
  if (usage) {
    sessionTokens.prompt += usage.prompt_tokens || 0;
    sessionTokens.completion += usage.completion_tokens || 0;
    sessionTokens.total += usage.total_tokens || 0;
  }
}

/**
 * Get current session token usage
 * @returns {Object} - Token usage statistics
 */
export function getTokenUsage() {
  return {
    ...sessionTokens
  };
}

/**
 * Reset token tracking
 */
export function resetTokenUsage() {
  sessionTokens = {
    prompt: 0,
    completion: 0,
    total: 0
  };
}

/**
 * Envía un análisis de página a la IA
 * @param {string} pageText - Texto extraído de la página
 * @param {number} pageNumber - Número de página
 * @param {Function} onLog - Callback para logs de progreso
 * @returns {Promise<string>} - Análisis de la página
 */
export async function analyzePage(pageText, pageNumber, onLog) {
  const model = process.env.MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free';
  const log = (message, color = 'white') => {
    if (onLog) onLog(message, color);
  };

  if (!process.env.CHUTES_API_KEY) {
    throw new Error('Missing CHUTES_API_KEY. Configure it in .env.');
  }

  // Select prompt based on configuration
  const systemPrompt = USE_V2_PROMPTS ? PAGE_ANALYSIS_PROMPT_V2 : PAGE_ANALYSIS_PROMPT;

  try {
    const estimatedInputTokens = estimateTokens(systemPrompt) + estimateTokens(pageText);
    log(`🤖 Analyzing page ${pageNumber} (~${estimatedInputTokens} tokens)...`, 'cyan');

    const response = await client.chat.completions.create({
      model: model,
      messages: [{
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `=== PÁGINA ${pageNumber} ===\n\n${pageText}`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    // Track token usage
    trackTokenUsage(response.usage);

    // Validate API response structure
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid API response structure: missing choices or message');
    }

    const analysis = response.choices[0].message.content;

    // Handle null or empty content from API
    if (analysis === null || analysis === undefined) {
      throw new Error(`API returned empty response for page ${pageNumber}. Please try again.`);
    }

    log(`✓ Page ${pageNumber} analyzed (${analysis.length} chars)`, 'green');

    return analysis;
  } catch (error) {
    log(`✗ Error analyzing page ${pageNumber}: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Genera el resumen final en formato IMRyD
 * @param {string} title - Título del documento
 * @param {Array} analyzedPages - Array de objetos { pageNumber, analysis, text }
 * @param {Function} onLog - Callback para logs de progreso
 * @returns {Promise<string>} - Resumen estructurado en Markdown
 */
export async function generateSummary(title, analyzedPages, onLog) {
  const model = process.env.MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free';
  const log = (message, color = 'white') => {
    if (onLog) onLog(message, color);
  };

  if (!process.env.CHUTES_API_KEY) {
    throw new Error('Missing CHUTES_API_KEY. Configure it in .env.');
  }

  // Select prompt based on configuration
  const systemPrompt = USE_V2_PROMPTS ?
    IMRYD_EXTRACTION_PROMPT :
    SUMMARY_GENERATION_PROMPT.replace('{title}', title);

  try {
    log('📝 Generating structured summary (IMRyD format)...', 'yellow');

    // Combine page analyses
    const combinedAnalysis = analyzedPages
      .map(page => `--- PÁGINA ${page.pageNumber} ---\n${page.analysis}`)
      .join('\n\n');

    // Include original text as reference (limited to avoid token overflow)
    const combinedText = analyzedPages
      .map(page => `=== PÁGINA ${page.pageNumber} ===\n${page.text}`)
      .join('\n\n---\n\n');

    // Limit text to avoid token limits
    const maxTextLength = 15000;
    const truncatedText = combinedText.length > maxTextLength ?
      combinedText.substring(0, maxTextLength) + '\n\n[... texto truncado por límite de tokens ...]' :
      combinedText;

    const estimatedInputTokens = estimateTokens(systemPrompt) + estimateTokens(combinedAnalysis) + estimateTokens(truncatedText);
    log(`📊 Estimated input: ~${estimatedInputTokens} tokens`, 'gray');

    const response = await client.chat.completions.create({
      model: model,
      messages: [{
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: USE_V2_PROMPTS ?
            `TÍTULO DEL DOCUMENTO: ${title}\n\n=== ANÁLISIS DEL DOCUMENTO ===\n\n${combinedAnalysis}\n\n\n=== TEXTO ORIGINAL DEL DOCUMENTO ===\n\n${truncatedText}` : `=== ANÁLISIS DEL DOCUMENTO ===\n\n${combinedAnalysis}\n\n\n=== TEXTO ORIGINAL DEL DOCUMENTO ===\n\n${truncatedText}`
        }
      ],
      temperature: 0.5,
      max_tokens: 8000
    });

    // Track token usage
    trackTokenUsage(response.usage);

    // Validate API response structure
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid API response structure: missing choices or message');
    }

    let summary = response.choices[0].message.content;

    // Handle null or empty content from API
    if (summary === null || summary === undefined) {
      log('⚠ API returned null content, attempting retry...', 'orange');
      throw new Error('API returned empty response. This may be due to content filtering or rate limiting. Please try again.');
    }

    // If using v2 prompts, try to parse and validate JSON
    if (USE_V2_PROMPTS) {
      try {
        // Extract JSON from response if wrapped in code blocks
        const jsonMatch = summary.match(/```json\s*([\s\S]*?)\s*```/) ||
          summary.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : summary;

        const parsed = JSON.parse(jsonStr);
        const validation = validateIMRyDResponse(parsed);

        if (!validation.valid) {
          log(`⚠ JSON validation warnings: ${validation.errors.join(', ')}`, 'orange');
        }

        // Convert JSON back to Markdown for display
        summary = convertIMRyDToMarkdown(parsed);
        log('✓ Structured summary validated', 'green');
      } catch (parseError) {
        // If JSON parsing fails, fall back to raw response
        log('⚠ Could not parse structured response, using raw output', 'orange');
      }
    }

    log(`✓ Summary generated (${summary.length} chars)`, 'green');

    // Log session token usage
    const usage = getTokenUsage();
    log(`📊 Session tokens: ${usage.total} total (${usage.prompt} input, ${usage.completion} output)`, 'gray');

    return summary;
  } catch (error) {
    log(`✗ Error generating summary: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Convert structured IMRyD JSON to Markdown format
 * @param {Object} imryd - Parsed IMRyD JSON object
 * @returns {string} - Formatted Markdown
 */
function convertIMRyDToMarkdown(imryd) {
  if (imryd.error) {
    return `# ⚠️ Error\n\n${imryd.error}\n\n${imryd.sugerencia || ''}`;
  }

  let md = '';

  // Title and metadata
  md += `# ${imryd.metadata?.titulo || 'Documento Médico'}\n\n`;

  if (imryd.metadata) {
    md += '## 📋 Metadatos\n\n';
    if (imryd.metadata.autores && imryd.metadata.autores !== 'No especificado en el documento') {
      md += `- **Autores:** ${Array.isArray(imryd.metadata.autores) ? imryd.metadata.autores.join(', ') : imryd.metadata.autores}\n`;
    }
    if (imryd.metadata.fecha_publicacion && imryd.metadata.fecha_publicacion !== 'No especificado en el documento') {
      md += `- **Fecha:** ${imryd.metadata.fecha_publicacion}\n`;
    }
    if (imryd.metadata.tipo_estudio && imryd.metadata.tipo_estudio !== 'No especificado en el documento') {
      md += `- **Tipo de estudio:** ${imryd.metadata.tipo_estudio}\n`;
    }
    if (imryd.metadata.doi && imryd.metadata.doi !== 'No especificado en el documento') {
      md += `- **DOI:** ${imryd.metadata.doi}\n`;
    }
    md += '\n';
  }

  // Introduction
  if (imryd.introduccion) {
    md += '## 📖 Introducción\n\n';
    md += `${imryd.introduccion.contexto || ''}\n\n`;
    if (imryd.introduccion.objetivo_principal) {
      md += `**Objetivo:** ${imryd.introduccion.objetivo_principal}\n\n`;
    }
  }

  // Methods
  if (imryd.metodos) {
    md += '## 🔬 Métodos\n\n';
    if (imryd.metodos.diseno) md += `**Diseño:** ${imryd.metodos.diseno}\n\n`;
    if (imryd.metodos.poblacion && imryd.metodos.poblacion !== 'No especificado en el documento') {
      md += `**Población:** ${imryd.metodos.poblacion}\n\n`;
    }
    if (imryd.metodos.tamano_muestra && imryd.metodos.tamano_muestra !== 'No especificado en el documento') {
      md += `**Tamaño de muestra:** ${imryd.metodos.tamano_muestra}\n\n`;
    }
  }

  // Results
  if (imryd.resultados) {
    md += '## 📊 Resultados\n\n';
    if (imryd.resultados.hallazgos_principales && Array.isArray(imryd.resultados.hallazgos_principales)) {
      imryd.resultados.hallazgos_principales.forEach((hallazgo, i) => {
        md += `### Hallazgo ${i + 1}\n`;
        md += `${hallazgo.descripcion || hallazgo}\n`;
        if (hallazgo.valor) md += `- **Valor:** ${hallazgo.valor}\n`;
        if (hallazgo.valor_p) md += `- **p-valor:** ${hallazgo.valor_p}\n`;
        md += '\n';
      });
    }
  }

  // Discussion
  if (imryd.discusion) {
    md += '## 💬 Discusión\n\n';
    md += `${imryd.discusion.interpretacion || ''}\n\n`;
    if (imryd.discusion.limitaciones && imryd.discusion.limitaciones !== 'No especificado en el documento') {
      md += '### Limitaciones\n';
      if (Array.isArray(imryd.discusion.limitaciones)) {
        imryd.discusion.limitaciones.forEach(lim => md += `- ${lim}\n`);
      } else {
        md += `${imryd.discusion.limitaciones}\n`;
      }
      md += '\n';
    }
  }

  // Key points
  if (imryd.puntos_clave && Array.isArray(imryd.puntos_clave)) {
    md += '## 💡 Puntos Clave\n\n';
    imryd.puntos_clave.forEach(punto => md += `- ${punto}\n`);
    md += '\n';
  }

  // Warnings/Disclaimers
  if (imryd.advertencias && Array.isArray(imryd.advertencias)) {
    md += '## ⚠️ Advertencias\n\n';
    imryd.advertencias.forEach(adv => md += `> ${adv}\n>\n`);
    md += '\n';
  }

  // Quality score
  if (imryd.calidad_extraccion) {
    md += `---\n\n*Confianza de extracción: ${Math.round((imryd.calidad_extraccion.score || 0) * 100)}%*\n`;
    if (imryd.calidad_extraccion.notas) {
      md += `\n*Notas: ${imryd.calidad_extraccion.notas}*\n`;
    }
  }

  return md;
}

export default {
  analyzePage,
  generateSummary,
  getTokenUsage,
  resetTokenUsage
};