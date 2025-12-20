/**
 * PDF Service - Extracción de Texto y Detección de Estructura
 *
 * Este servicio extrae texto de PDFs y lo divide en páginas reales con pagerender.
 * Si la extracción por página es incompleta, usa un fallback de distribución uniforme.
 */

import fs from 'fs';
import pdf from 'pdf-parse';

/**
 * Lee un PDF y extrae todo el texto
 * @param {string} pdfPath - Ruta al archivo PDF
 * @param {Function} onLog - Callback para logs de progreso
 * @returns {Promise<Object>} - Objeto con texto y metadatos
 */
export async function extractTextFromPDF(pdfPath, onLog) {
  const log = (message, color = 'white') => {
    if (onLog) onLog(message, color);
  };

  try {
    log('📄 Loading PDF file...', 'cyan');

    const dataBuffer = fs.readFileSync(pdfPath);
    const pageTexts = [];
    const renderPage = (pageData) =>
      pageData.getTextContent({ normalizeWhitespace: true }).then((textContent) => {
        let lastY = null;
        let text = '';

        for (const item of textContent.items) {
          if (!item.str) continue;
          if (lastY === item.transform[5] || lastY === null) {
            text += item.str;
          } else {
            text += `\n${item.str}`;
          }
          lastY = item.transform[5];
        }

        const pageNumber = pageData.pageNumber;
        if (Number.isInteger(pageNumber) && pageNumber > 0) {
          pageTexts[pageNumber - 1] = text;
        } else {
          pageTexts.push(text);
        }
        return text;
      });

    const pdfData = await pdf(dataBuffer, { pagerender: renderPage });

    log(`✓ PDF loaded: ${pdfData.numpages} pages detected`, 'green');

    let pages = [];
    let hasAllPages = pageTexts.length === pdfData.numpages;
    if (hasAllPages) {
      for (let i = 0; i < pdfData.numpages; i++) {
        if (typeof pageTexts[i] !== 'string') {
          hasAllPages = false;
          break;
        }
      }
    }

    if (hasAllPages) {
      pages = pageTexts.map((text, index) => {
        const trimmed = text.trim();
        return {
          pageNumber: index + 1,
          text: trimmed.length > 0 ? trimmed : '[Página sin texto extraíble]'
        };
      });
    } else {
      log('⚠ Page-level extraction incomplete; using fallback segmentation.', 'orange');
      pages = splitIntoPages(pdfData.text, pdfData.numpages);
    }

    return {
      numpages: pdfData.numpages,
      text: pdfData.text,
      metadata: pdfData.metadata,
      pages,
      rawData: dataBuffer
    };
  } catch (error) {
    log(`✗ Error loading PDF: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Divide el texto en páginas individuales basadas en el número REAL de páginas del PDF
 * @param {string} fullText - Texto completo del PDF
 * @param {number} numPages - Número real de páginas del PDF
 * @returns {Array} - Array de objetos { pageNumber, text }
 */
export function splitIntoPages(fullText, numPages) {
  if (!numPages || numPages <= 0) {
    return [];
  }

  // Si no hay texto o número de páginas inválido
  if (!fullText || fullText.trim().length === 0) {
    return Array.from({ length: numPages }, (_, i) => ({
      pageNumber: i + 1,
      text: '[Página vacía - sin texto extraíble]'
    }));
  }

  const lines = fullText.split(/\r?\n/);
  const totalLines = lines.length;
  const linesPerPage = Math.ceil(totalLines / numPages);

  const pages = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const startLine = (pageNum - 1) * linesPerPage;
    const endLine = Math.min(startLine + linesPerPage, totalLines);
    const pageLines = lines.slice(startLine, endLine);
    const pageText = pageLines.join('\n').trim();

    pages.push({
      pageNumber: pageNum,
      text: pageText.length > 0 ? pageText : '[Página sin texto extraíble]'
    });
  }

  return pages;
}

/**
 * Detecta la estructura del documento buscando patrones Part/Chapter/Section
 * @param {Array} pages - Array de páginas con texto
 * @param {Function} onLog - Callback para logs
 * @returns {Object} - Estructura detectada { parts, chapters }
 */
export function detectStructure(pages, onLog) {
  const log = (message, color = 'white') => {
    if (onLog) onLog(message, color);
  };

  log('🔍 Analyzing document structure...', 'cyan');

  const structure = {
    parts: [],
    chapters: [],
    sections: []
  };

  const partPattern = /^\s*(?:Part|Parte|PART)\s+([IVX0-9]+(?:\.[0-9]+)?)[\s:.-]*(.*)$/im;
  const chapterPattern = /^\s*(?:Chapter|Capítulo|CAPÍTULO)\s+([0-9]+(?:\.[0-9]+)?)[\s:.-]*(.*)$/im;

  let currentPart = null;
  let currentChapter = null;

  // Primera pasada: detectar partes y capítulos
  for (const page of pages) {
    const lines = page.text.split('\n').slice(0, 10);

    for (const line of lines) {
      const partMatch = line.match(partPattern);
      const chapterMatch = line.match(chapterPattern);

      if (partMatch) {
        currentPart = {
          id: `part-${partMatch[1]}`,
          number: partMatch[1],
          title: partMatch[2].trim() || `Part ${partMatch[1]}`,
          startPage: page.pageNumber,
          chapters: []
        };
        structure.parts.push(currentPart);
        log(`  📁 Detected: ${currentPart.title}`, 'magenta');
      }

      if (chapterMatch && currentPart) {
        currentChapter = {
          id: `chapter-${chapterMatch[1]}`,
          number: chapterMatch[1],
          title: chapterMatch[2].trim() || `Chapter ${chapterMatch[1]}`,
          startPage: page.pageNumber,
          sections: []
        };
        currentPart.chapters.push(currentChapter);
        structure.chapters.push(currentChapter);
        log(`    📂 Detected: ${currentChapter.title}`, 'blue');
      }
    }
  }

  // Si no se detectó estructura, crear una por defecto
  if (structure.parts.length === 0) {
    structure.parts.push({
      id: 'part-1',
      number: '1',
      title: 'Documento Completo',
      startPage: 1,
      chapters: []
    });
  }

  log(`✓ Structure analysis: ${structure.parts.length} parts, ${structure.chapters.length} chapters`, 'green');

  return structure;
}

export default {
  extractTextFromPDF,
  splitIntoPages,
  detectStructure
};
