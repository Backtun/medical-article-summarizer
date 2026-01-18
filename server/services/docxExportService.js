/**
 * DOCX Export Service
 *
 * Generates Word documents from processed summaries.
 * Uses docx library for cross-platform compatibility.
 */

// Note: This uses basic HTML-to-DOCX approach without the docx library
// For production, install: npm install docx

/**
 * Convert Markdown to basic HTML
 * @param {string} markdown - Markdown content
 * @returns {string} - HTML content
 */
function markdownToHtml(markdown) {
  if (!markdown) return '';

  return markdown
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^\- (.*$)/gm, '<li>$1</li>')
    // Blockquotes
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

/**
 * Generate DOCX-compatible HTML (for download)
 * @param {Object} result - Processing result
 * @returns {Object} - { content, filename, mimeType }
 */
export function exportAsDocx(result) {
  const timestamp = new Date().toISOString().split('T')[0];
  const safeTitle = sanitizeFilename(result.title || 'documento');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${result.title}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #1a5f7a; border-bottom: 2px solid #1a5f7a; padding-bottom: 10px; }
    h2 { color: #2c3e50; margin-top: 20px; }
    h3 { color: #34495e; }
    blockquote { border-left: 4px solid #e74c3c; padding-left: 15px; color: #7f8c8d; margin: 15px 0; }
    .metadata { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .disclaimer { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin-top: 30px; border-radius: 5px; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f2f2f2; }
  </style>
</head>
<body>
  <h1>${result.title}</h1>
  
  <div class="metadata">
    <p><strong>Procesado:</strong> ${result.processedAt}</p>
    <p><strong>Páginas:</strong> ${result.totalPages}</p>
    ${result.metadata?.Author ? `<p><strong>Autor:</strong> ${result.metadata.Author}</p>` : ''}
  </div>

  ${markdownToHtml(result.summary)}

  <div class="disclaimer">
    <p><strong>⚠️ Aviso Importante:</strong></p>
    <p>Este resumen es informativo y no constituye consejo médico. 
    Los contenidos han sido generados por inteligencia artificial y deben 
    verificarse siempre con el documento original y con profesionales de la salud.</p>
  </div>

  <hr>
  <p><small>Generado por Medical Article Summarizer • ${new Date().toISOString()}</small></p>
</body>
</html>`;

  return {
    content: htmlContent,
    filename: `${safeTitle}_${timestamp}.html`,
    mimeType: 'text/html'
  };
}

/**
 * Sanitize filename
 * @param {string} filename - Original filename
 * @returns {string} - Safe filename
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9-_\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

export default {
  exportAsDocx
};