/**
 * Ollama Service - Local LLM Integration
 *
 * Provides integration with local Ollama instance for:
 * - Privacy-sensitive document processing
 * - Offline operation
 * - Cost savings
 *
 * Requires Ollama running locally: https://ollama.ai
 */

// Ollama default configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

/**
 * Check if Ollama is available
 * @returns {Promise<boolean>} - Whether Ollama is running
 */
export async function isOllamaAvailable() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Get available Ollama models
 * @returns {Promise<string[]>} - List of model names
 */
export async function getAvailableModels() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) throw new Error('Failed to fetch models');

    const data = await response.json();
    return (data.models && data.models.map) ? data.models.map(m => m.name) : [];
  } catch (error) {
    console.error('Error fetching Ollama models:', error.message);
    return [];
  }
}

/**
 * Generate completion with Ollama
 * @param {string} prompt - User prompt
 * @param {Object} options - Generation options
 * @returns {Promise<string>} - Generated text
 */
export async function generate(prompt, options = {}) {
  const {
    model = OLLAMA_MODEL,
      system = '',
      temperature = 0.3,
      maxTokens = 4000
  } = options;

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      prompt,
      system,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama error: ${error}`);
  }

  const data = await response.json();
  return data.response;
}

/**
 * Chat completion with Ollama
 * @param {Array} messages - Chat messages [{ role, content }]
 * @param {Object} options - Generation options
 * @returns {Promise<string>} - Assistant response
 */
export async function chat(messages, options = {}) {
  const {
    model = OLLAMA_MODEL,
      temperature = 0.3,
      maxTokens = 4000
  } = options;

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama chat error: ${error}`);
  }

  const data = await response.json();
  return (data.message && data.message.content) ? data.message.content : '';
}

/**
 * Analyze page with Ollama (drop-in replacement for aiService)
 * @param {string} pageText - Page text
 * @param {number} pageNumber - Page number
 * @param {Function} onLog - Log callback
 * @returns {Promise<string>} - Analysis
 */
export async function analyzePage(pageText, pageNumber, onLog) {
  const log = (msg, color) => onLog && onLog(msg, color);

  const available = await isOllamaAvailable();
  if (!available) {
    throw new Error('Ollama is not running. Start it with: ollama serve');
  }

  log(`🦙 Analyzing page ${pageNumber} with Ollama (${OLLAMA_MODEL})...`, 'cyan');

  const systemPrompt = `Eres un asistente médico experto. Analiza el siguiente texto de un artículo médico y extrae los puntos clave.
Sé preciso y cita solo lo que aparece en el texto. Si algo no está claro, indícalo.
Responde en español.`;

  const analysis = await chat([{
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: `=== PÁGINA ${pageNumber} ===\n\n${pageText}`
    }
  ]);

  log(`✓ Page ${pageNumber} analyzed with Ollama (${analysis.length} chars)`, 'green');
  return analysis;
}

/**
 * Generate summary with Ollama (drop-in replacement for aiService)
 * @param {string} title - Document title
 * @param {Array} analyzedPages - Analyzed pages
 * @param {Function} onLog - Log callback
 * @returns {Promise<string>} - Summary markdown
 */
export async function generateSummary(title, analyzedPages, onLog) {
  const log = (msg, color) => onLog && onLog(msg, color);

  const available = await isOllamaAvailable();
  if (!available) {
    throw new Error('Ollama is not running. Start it with: ollama serve');
  }

  log(`🦙 Generating summary with Ollama (${OLLAMA_MODEL})...`, 'yellow');

  const combinedAnalysis = analyzedPages
    .map(p => `--- PÁGINA ${p.pageNumber} ---\n${p.analysis}`)
    .join('\n\n');

  const systemPrompt = `Eres un experto en síntesis de literatura médica. Genera un resumen estructurado en formato IMRyD (Introducción, Métodos, Resultados, Discusión) basado en el análisis proporcionado.

IMPORTANTE:
- Solo incluye información que aparece explícitamente en el documento
- Si algo no está claro, indícalo con "No especificado en el documento"
- Incluye una sección de advertencias al final
- Responde en español
- Usa formato Markdown`;

  const summary = await chat([{
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: `TÍTULO: ${title}\n\n${combinedAnalysis}`
    }
  ]);

  log(`✓ Summary generated with Ollama (${summary.length} chars)`, 'green');

  // Add disclaimer
  return summary + `

---

## ⚠️ Aviso Importante

> **Este resumen es informativo y no constituye consejo médico.**
> Generado localmente con Ollama (${OLLAMA_MODEL}).
> Verifique siempre con el documento original.
`;
}

/**
 * Get Ollama status info
 * @returns {Promise<Object>} - Status info
 */
export async function getStatus() {
  const available = await isOllamaAvailable();
  const models = available ? await getAvailableModels() : [];

  return {
    available,
    baseUrl: OLLAMA_BASE_URL,
    configuredModel: OLLAMA_MODEL,
    availableModels: models,
    modelInstalled: models.includes(OLLAMA_MODEL)
  };
}

export default {
  isOllamaAvailable,
  getAvailableModels,
  generate,
  chat,
  analyzePage,
  generateSummary,
  getStatus
};