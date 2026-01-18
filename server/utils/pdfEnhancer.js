/**
 * PDF Enhancement Utilities
 *
 * Advanced PDF processing utilities for:
 * - Table detection
 * - Column detection
 * - Header/Footer removal
 * - Figure caption extraction
 */

/**
 * Detect tables in text
 * @param {string} text - Page text
 * @returns {Object[]} - Detected tables
 */
export function detectTables(text) {
  const tables = [];

  // Pattern: Multiple lines with consistent delimiters (|, tabs, or aligned columns)
  const lines = text.split('\n');
  let tableStart = -1;
  let tableLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for table-like patterns
    const hasDelimiters = (line.match(/\|/g) || []).length >= 2;
    const hasMultipleTabs = (line.match(/\t/g) || []).length >= 2;
    const hasAlignedSpaces = /\s{3,}/.test(line) && line.trim().length > 20;

    if (hasDelimiters || hasMultipleTabs || hasAlignedSpaces) {
      if (tableStart === -1) tableStart = i;
      tableLines.push(line);
    } else if (tableStart !== -1) {
      // End of potential table
      if (tableLines.length >= 2) {
        tables.push({
          startLine: tableStart,
          endLine: i - 1,
          content: tableLines.join('\n'),
          rowCount: tableLines.length
        });
      }
      tableStart = -1;
      tableLines = [];
    }
  }

  // Handle table at end of text
  if (tableLines.length >= 2) {
    tables.push({
      startLine: tableStart,
      endLine: lines.length - 1,
      content: tableLines.join('\n'),
      rowCount: tableLines.length
    });
  }

  return tables;
}

/**
 * Detect multi-column layout
 * @param {string} text - Page text
 * @returns {Object} - Column detection result
 */
export function detectColumns(text) {
  const lines = text.split('\n');

  // Check for column indicators
  let shortLineCount = 0;
  let longLineCount = 0;
  const lineWidths = [];

  for (const line of lines) {
    const width = line.length;
    lineWidths.push(width);

    if (width > 10 && width < 50) shortLineCount++;
    if (width > 80) longLineCount++;
  }

  // Calculate average and std deviation
  const avgWidth = lineWidths.reduce((a, b) => a + b, 0) / lineWidths.length;

  // Two-column detection heuristic
  const isTwoColumn = shortLineCount > lines.length * 0.4 && avgWidth < 60;

  return {
    isTwoColumn,
    avgLineWidth: Math.round(avgWidth),
    shortLineRatio: (shortLineCount / lines.length).toFixed(2),
    lineCount: lines.length
  };
}

/**
 * Remove common headers and footers
 * @param {string} text - Page text
 * @param {Object} options - Options
 * @returns {string} - Cleaned text
 */
export function removeHeadersFooters(text, options = {}) {
  const {
    removePageNumbers = true,
      removeRunningHeaders = true,
      minContentLines = 5
  } = options;

  const lines = text.split('\n');

  if (lines.length <= minContentLines) {
    return text; // Too short to process
  }

  let startIndex = 0;
  let endIndex = lines.length;

  // Remove top header (first 1-3 lines if they look like headers)
  if (removeRunningHeaders) {
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].trim();
      if (isLikelyHeader(line)) {
        startIndex = i + 1;
      } else {
        break;
      }
    }
  }

  // Remove bottom footer (last 1-3 lines if they look like footers)
  if (removePageNumbers) {
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
      const line = lines[i].trim();
      if (isLikelyFooter(line)) {
        endIndex = i;
      } else {
        break;
      }
    }
  }

  return lines.slice(startIndex, endIndex).join('\n');
}

/**
 * Check if line is likely a header
 * @param {string} line - Text line
 * @returns {boolean}
 */
function isLikelyHeader(line) {
  if (!line || line.length < 3) return true;
  if (line.length > 100) return false;

  // Common header patterns
  const headerPatterns = [
    /^page\s*\d+/i,
    /^\d+\s*$/,
    /^[A-Z][a-z]+\s+\d{4}$/, // "Journal 2025"
    /^Vol\.\s*\d+/i,
    /^doi:/i,
    /^https?:\/\//i,
    /^©\s*\d{4}/,
    /^Running\s+head/i
  ];

  return headerPatterns.some(p => p.test(line));
}

/**
 * Check if line is likely a footer
 * @param {string} line - Text line
 * @returns {boolean}
 */
function isLikelyFooter(line) {
  if (!line || line.length < 2) return true;
  if (line.length > 50) return false;

  // Common footer patterns
  const footerPatterns = [
    /^\d+$/, // Just a page number
    /^Page\s*\d+/i,
    /^\d+\s*of\s*\d+$/i,
    /^[-–—]\s*\d+\s*[-–—]$/, // - 5 -
    /^©/,
    /^www\./i
  ];

  return footerPatterns.some(p => p.test(line));
}

/**
 * Extract figure captions
 * @param {string} text - Page text
 * @returns {Object[]} - Extracted captions
 */
export function extractFigureCaptions(text) {
  const captions = [];

  // Figure caption patterns
  const patterns = [
    /(?:Figure|Fig\.?)\s*(\d+)[.:]\s*(.+?)(?=\n\n|\n(?:Figure|Fig|Table)|$)/gis,
    /(?:Figura)\s*(\d+)[.:]\s*(.+?)(?=\n\n|\n(?:Figura|Tabla)|$)/gis
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      captions.push({
        type: 'figure',
        number: match[1],
        caption: match[2].trim(),
        fullMatch: match[0]
      });
    }
  }

  return captions;
}

/**
 * Extract table captions
 * @param {string} text - Page text
 * @returns {Object[]} - Extracted captions
 */
export function extractTableCaptions(text) {
  const captions = [];

  const patterns = [
    /(?:Table|Tabla)\s*(\d+)[.:]\s*(.+?)(?=\n\n|\n(?:Table|Tabla|Figure|Fig)|$)/gis
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      captions.push({
        type: 'table',
        number: match[1],
        caption: match[2].trim(),
        fullMatch: match[0]
      });
    }
  }

  return captions;
}

/**
 * Analyze page complexity
 * @param {string} text - Page text
 * @returns {Object} - Complexity analysis
 */
export function analyzeComplexity(text) {
  const tables = detectTables(text);
  const columns = detectColumns(text);
  const figures = extractFigureCaptions(text);
  const tableCaptions = extractTableCaptions(text);

  const wordCount = text.split(/\s+/).length;
  const paragraphCount = text.split(/\n\n+/).length;

  return {
    wordCount,
    paragraphCount,
    hasTables: tables.length > 0,
    tableCount: tables.length,
    isTwoColumn: columns.isTwoColumn,
    figureCount: figures.length,
    tableCaptionCount: tableCaptions.length,
    complexity: calculateComplexityScore(tables, columns, figures)
  };
}

/**
 * Calculate complexity score
 * @param {Object[]} tables
 * @param {Object} columns
 * @param {Object[]} figures
 * @returns {string} - low, medium, high
 */
function calculateComplexityScore(tables, columns, figures) {
  let score = 0;

  if (tables.length > 0) score += 2;
  if (tables.length > 2) score += 1;
  if (columns.isTwoColumn) score += 1;
  if (figures.length > 2) score += 1;

  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

export default {
  detectTables,
  detectColumns,
  removeHeadersFooters,
  extractFigureCaptions,
  extractTableCaptions,
  analyzeComplexity
};