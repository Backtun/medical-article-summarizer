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
    log('📄 Cargando archivo PDF...', 'cyan');

    const dataBuffer = fs.readFileSync(pdfPath);
    const pageTexts = [];
    const renderPage = (pageData) =>
      pageData.getTextContent({
        normalizeWhitespace: true
      }).then((textContent) => {
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

    const pdfData = await pdf(dataBuffer, {
      pagerender: renderPage
    });

    log(`✓ PDF cargado: ${pdfData.numpages} páginas detectadas`, 'green');

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
      log('⚠ Extracción por página incompleta; usando segmentación de respaldo.', 'orange');
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
    log(`✗ Error cargando PDF: ${error.message}`, 'red');
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
    return Array.from({
      length: numPages
    }, (_, i) => ({
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
 * IMRyD section patterns for medical articles
 */
const IMRYD_PATTERNS = {
  abstract: /^(?:\d+[\.\s]*)?(?:ABSTRACT|Abstract|Resumen|RESUMEN|Summary)\s*$/im,
  introduction: /^(?:\d+[\.\s]*)?(?:INTRODUCTION|Introduction|Introducción|INTRODUCCIÓN|Background|BACKGROUND)\s*$/im,
  methods: /^(?:\d+[\.\s]*)?(?:METHODS?|Methods?|METHODOLOGY|Methodology|Metodolog[íi]a|METODOLOG[ÍI]A|Materials?\s+and\s+Methods?|MATERIALS?\s+AND\s+METHODS?|Patients?\s+and\s+Methods?)\s*$/im,
  results: /^(?:\d+[\.\s]*)?(?:RESULTS?|Results?|Resultados?|RESULTADOS?|Findings?|FINDINGS?)\s*$/im,
  discussion: /^(?:\d+[\.\s]*)?(?:DISCUSSION|Discussion|Discusión|DISCUSIÓN|CONCLUSIONS?|Conclusions?|Conclusiones?)\s*$/im,
  references: /^(?:\d+[\.\s]*)?(?:REFERENCES?|References?|Referencias?|REFERENCIAS?|Bibliography|BIBLIOGRAPHY|Bibliograf[íi]a)\s*$/im
};

/**
 * Detecta la estructura del documento buscando patrones IMRyD y Part/Chapter/Section
 * @param {Array} pages - Array de páginas con texto
 * @param {Function} onLog - Callback para logs
 * @returns {Object} - Estructura detectada { parts, chapters, imryd }
 */
export function detectStructure(pages, onLog) {
  const log = (message, color = 'white') => {
    if (onLog) onLog(message, color);
  };

  log('🔍 Analizando estructura del documento...', 'cyan');

  const structure = {
    parts: [],
    chapters: [],
    sections: [],
    imryd: {
      abstract: null,
      introduction: null,
      methods: null,
      results: null,
      discussion: null,
      references: null
    },
    isIMRyDFormat: false
  };

  const partPattern = /^\s*(?:Part|Parte|PART)\s+([IVX0-9]+(?:\.[0-9]+)?)[\s:.-]*(.*)$/im;
  const chapterPattern = /^\s*(?:Chapter|Capítulo|CAPÍTULO)\s+([0-9]+(?:\.[0-9]+)?)[\s:.-]*(.*)$/im;

  let currentPart = null;
  let currentChapter = null;

  // Analyze all pages
  for (const page of pages) {
    const lines = page.text.split('\n');

    // Check first 20 lines for section headers
    const headerLines = lines.slice(0, 20);

    for (const line of headerLines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check for Part/Chapter structure
      const partMatch = trimmedLine.match(partPattern);
      const chapterMatch = trimmedLine.match(chapterPattern);

      if (partMatch) {
        currentPart = {
          id: `part-${partMatch[1]}`,
          number: partMatch[1],
          title: partMatch[2].trim() || `Part ${partMatch[1]}`,
          startPage: page.pageNumber,
          chapters: []
        };
        structure.parts.push(currentPart);
        log(`  📁 Detectado: ${currentPart.title}`, 'magenta');
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
        log(`    📂 Detectado: ${currentChapter.title}`, 'blue');
      }

      // Check for IMRyD sections
      for (const [sectionName, pattern] of Object.entries(IMRYD_PATTERNS)) {
        if (pattern.test(trimmedLine) && !structure.imryd[sectionName]) {
          structure.imryd[sectionName] = {
            startPage: page.pageNumber,
            title: trimmedLine,
            detected: true
          };
          log(`  🔬 Sección IMRyD: ${sectionName.toUpperCase()} (página ${page.pageNumber})`, 'cyan');
        }
      }
    }
  }

  // Determine if document follows IMRyD format
  const imrydSections = ['introduction', 'methods', 'results', 'discussion'];
  const detectedImrydCount = imrydSections.filter(s => structure.imryd[s]).length;
  structure.isIMRyDFormat = detectedImrydCount >= 2; // At least 2 of the 4 main sections

  // If no part structure detected, create default
  if (structure.parts.length === 0) {
    structure.parts.push({
      id: 'part-1',
      number: '1',
      title: structure.isIMRyDFormat ? 'Artículo Médico' : 'Documento Completo',
      startPage: 1,
      chapters: []
    });
  }

  // Summary log
  if (structure.isIMRyDFormat) {
    log(`✓ Formato IMRyD detectado (${detectedImrydCount}/4 secciones)`, 'green');
  } else {
    log(`⚠ Formato IMRyD estándar no detectado (${detectedImrydCount}/4 secciones)`, 'orange');
  }

  log(`✓ Análisis de estructura: ${structure.parts.length} partes, ${structure.chapters.length} capítulos`, 'green');

  return structure;
}

/**
 * Removes common headers/footers from page text
 * @param {string} text - Page text
 * @param {number} pageNumber - Current page number
 * @returns {string} - Cleaned text
 */
export function cleanPageText(text, pageNumber) {
  if (!text) return '';

  let cleaned = text;

  // Remove common header/footer patterns
  const patterns = [
    // Page numbers
    /^[\s]*[-–—]?\s*\d+\s*[-–—]?[\s]*$/gm,
    /^[\s]*Page\s+\d+[\s]*$/gim,
    /^[\s]*Página\s+\d+[\s]*$/gim,
    // Common journal headers (generic)
    /^[\s]*©\s*\d{4}.*$/gm,
    /^[\s]*Copyright\s+.*$/gim,
    // DOI patterns often repeated
    /^[\s]*https?:\/\/doi\.org\/.*$/gm,
    // Empty lines and whitespace runs
    /^\s*$/gm
  ];

  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Collapse multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

export default {
  extractTextFromPDF,
  splitIntoPages,
  detectStructure,
  cleanPageText
};