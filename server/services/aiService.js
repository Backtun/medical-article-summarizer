/**
 * AI Service - OpenRouter Integration
 *
 * Este servicio encapsula toda la lógica de comunicación con OpenRouter.
 * Implementa el patrón de agnosticismo de modelo permitiendo cambiar
 * entre GPT-4o, Claude, Llama, etc. solo modificando variables de entorno.
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { PAGE_ANALYSIS_PROMPT, SUMMARY_GENERATION_PROMPT } from '../utils/prompts.js';

dotenv.config({ path: '../.env' });

// Configuración del cliente OpenRouter
const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:5173',
    'X-Title': process.env.SITE_NAME || 'Medical Summarizer',
  },
});

/**
 * Envía un análisis de página a la IA
 * @param {string} pageText - Texto extraído de la página
 * @param {number} pageNumber - Número de página
 * @param {Function} onLog - Callback para logs de progreso
 * @returns {Promise<string>} - Análisis de la página
 */
export async function analyzePage(pageText, pageNumber, onLog) {
  const model = process.env.MODEL || 'openai/gpt-5-mini';

  try {
    onLog({
      type: 'log',
      text: `🤖 Analyzing page ${pageNumber} with ${model}...`,
      color: 'cyan'
    });

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: PAGE_ANALYSIS_PROMPT
        },
        {
          role: 'user',
          content: `=== PÁGINA ${pageNumber} ===\n\n${pageText}`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const analysis = response.choices[0].message.content;

    onLog({
      type: 'log',
      text: `✓ Page ${pageNumber} analyzed (${analysis.length} chars)`,
      color: 'green'
    });

    return analysis;
  } catch (error) {
    onLog({
      type: 'log',
      text: `✗ Error analyzing page ${pageNumber}: ${error.message}`,
      color: 'red'
    });
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
  const model = process.env.MODEL || 'openai/gpt-5-mini';

  try {
    onLog({
      type: 'log',
      text: '📝 Generating structured summary (IMRyD format)...',
      color: 'yellow'
    });

    // Combinar análisis de páginas - extraer la propiedad .analysis de cada objeto
    const combinedAnalysis = analyzedPages
      .map(page => `--- PÁGINA ${page.pageNumber} ---\n${page.analysis}`)
      .join('\n\n');

    // También incluir texto original como referencia
    const combinedText = analyzedPages
      .map(page => `=== PÁGINA ${page.pageNumber} ===\n${page.text}`)
      .join('\n\n---\n\n');

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: SUMMARY_GENERATION_PROMPT.replace('{title}', title)
        },
        {
          role: 'user',
          content: `=== ANÁLISIS DEL DOCUMENTO ===\n\n${combinedAnalysis}\n\n\n=== TEXTO ORIGINAL DEL DOCUMENTO ===\n\n${combinedText.substring(0, 15000)}`
        }
      ],
      temperature: 0.5,
      max_tokens: 8000,
    });

    const summary = response.choices[0].message.content;

    onLog({
      type: 'log',
      text: `✓ Summary generated (${summary.length} chars)`,
      color: 'green'
    });

    return summary;
  } catch (error) {
    onLog({
      type: 'log',
      text: `✗ Error generating summary: ${error.message}`,
      color: 'red'
    });
    throw error;
  }
}

export default {
  analyzePage,
  generateSummary
};
