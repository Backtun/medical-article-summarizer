/**
 * ExportButtons Component
 *
 * Provides export functionality for processed summaries.
 * Supports Markdown, JSON, and HTML export formats.
 */

import { useCallback } from 'react';

/**
 * Sanitize filename for safe usage
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9-_\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

/**
 * Trigger file download in browser
 * @param {string} content - File content
 * @param {string} filename - Download filename
 * @param {string} mimeType - File MIME type
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert Markdown to basic HTML
 */
function markdownToHtml(markdown) {
  if (!markdown) return '';
  return markdown
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function ExportButtons({ result }) {
  const timestamp = new Date().toISOString().split('T')[0];
  const safeTitle = sanitizeFilename(result?.title || 'documento');

  /**
   * Export as Markdown
   */
  const handleExportMarkdown = useCallback(() => {
    if (!result) return;

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
    content += `> ⚠️ **Aviso:** Este resumen es informativo y no constituye consejo médico.\n`;
    content += `> Generado por Medical Article Summarizer • ${new Date().toISOString()}\n`;

    downloadFile(content, `${safeTitle}_${timestamp}.md`, 'text/markdown');
  }, [result, timestamp, safeTitle]);

  /**
   * Export as JSON
   */
  const handleExportJSON = useCallback(() => {
    if (!result) return;

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
      pageCount: result.pages?.length || 0,
      disclaimer: 'Este resumen es informativo y no constituye consejo médico.'
    };

    downloadFile(
      JSON.stringify(exportData, null, 2),
      `${safeTitle}_${timestamp}.json`,
      'application/json'
    );
  }, [result, timestamp, safeTitle]);

  /**
   * Export as HTML (Word compatible)
   */
  const handleExportHTML = useCallback(() => {
    if (!result) return;

    const htmlContent = `<!DOCTYPE html>
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
  </style>
</head>
<body>
  <h1>${result.title}</h1>
  
  <div class="metadata">
    <p><strong>Procesado:</strong> ${result.processedAt}</p>
    <p><strong>Páginas:</strong> ${result.totalPages}</p>
  </div>

  <p>${markdownToHtml(result.summary)}</p>

  <div class="disclaimer">
    <p><strong>⚠️ Aviso Importante:</strong></p>
    <p>Este resumen es informativo y no constituye consejo médico. 
    Verifique siempre con el documento original y consulte con profesionales de la salud.</p>
  </div>

  <hr>
  <p><small>Generado por Medical Article Summarizer • ${new Date().toISOString()}</small></p>
</body>
</html>`;

    downloadFile(htmlContent, `${safeTitle}_${timestamp}.html`, 'text/html');
  }, [result, timestamp, safeTitle]);

  if (!result) return null;

  return (
    <div className="export-buttons">
      <button
        className="export-btn export-btn--md"
        onClick={handleExportMarkdown}
        title="Exportar como Markdown"
      >
        📄 Markdown
      </button>
      <button
        className="export-btn export-btn--json"
        onClick={handleExportJSON}
        title="Exportar como JSON"
      >
        📋 JSON
      </button>
      <button
        className="export-btn export-btn--html"
        onClick={handleExportHTML}
        title="Exportar como HTML (para Word)"
      >
        📝 HTML
      </button>
    </div>
  );
}

export default ExportButtons;
