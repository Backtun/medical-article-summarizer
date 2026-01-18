/**
 * Export Service - Summary Export Functionality
 *
 * Provides functionality to export summaries in various formats:
 * - Markdown (.md)
 * - JSON (.json)
 */

/**
 * Export summary as Markdown
 * @param {Object} result - Processing result object
 * @returns {Object} - { content: string, filename: string, mimeType: string }
 */
export function exportAsMarkdown(result) {
  const timestamp = new Date().toISOString().split('T')[0];
  const safeTitle = sanitizeFilename(result.title || 'documento');

  let content = `# ${result.title}\n\n`;
  content += `**Procesado:** ${result.processedAt}\n`;
  content += `**Páginas:** ${result.totalPages}\n`;

  if (result.metadata) {
    content += '\n## Metadatos del Documento\n\n';
    Object.entries(result.metadata).forEach(([key, value]) => {
      if (value) content += `- **${key}:** ${value}\n`;
    });
  }

  content += '\n---\n\n';
  content += result.summary || '';

  content += '\n\n---\n\n';
  content += `> Generado por Medical Article Summarizer\n`;
  content += `> ${new Date().toISOString()}\n`;

  return {
    content,
    filename: `${safeTitle}_${timestamp}.md`,
    mimeType: 'text/markdown'
  };
}

/**
 * Export summary as JSON
 * @param {Object} result - Processing result object
 * @returns {Object} - { content: string, filename: string, mimeType: string }
 */
export function exportAsJSON(result) {
  const timestamp = new Date().toISOString().split('T')[0];
  const safeTitle = sanitizeFilename(result.title || 'documento');

  const pageCount = result.pages ? result.pages.length : 0;

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    document: {
      title: result.title,
      fileName: result.fileName,
      totalPages: result.totalPages,
      processedAt: result.processedAt,
      metadata: result.metadata,
      documentHash: result.documentHash
    },
    structure: result.structure,
    summary: result.summary,
    pageCount: pageCount,
    disclaimer: result.disclaimer || 'Este resumen es informativo y no constituye consejo médico.'
  };

  return {
    content: JSON.stringify(exportData, null, 2),
    filename: `${safeTitle}_${timestamp}.json`,
    mimeType: 'application/json'
  };
}

/**
 * Sanitize filename for safe file system usage
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9-_\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

export default {
  exportAsMarkdown,
  exportAsJSON
};