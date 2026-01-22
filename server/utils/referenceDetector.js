/**
 * Reference Page Detector Module
 *
 * Detects pages that contain primarily bibliographic references to prevent
 * AI hallucination when processing pages with no substantive medical content.
 *
 * Layer 1 of 3-layer anti-hallucination defense:
 * 1. Pre-AI Detection (this module)
 * 2. Controller Filtering (pdfController.js)
 * 3. Prompt Anti-Hallucination (prompts.js)
 *
 * v2.0: Added support for MIXED_CONTENT pages that contain both
 * substantive content AND references (e.g., Conclusion + References on same page)
 */

/**
 * Page classification types
 */
export const PAGE_CLASSIFICATION = {
  PURE_REFERENCES: 'PURE_REFERENCES',       // >70% references, no important sections
  MIXED_CONTENT: 'MIXED_CONTENT',           // Has references BUT also important content
  SUBSTANTIVE_CONTENT: 'SUBSTANTIVE_CONTENT' // Normal content, process fully
};

/**
 * Patterns for important medical/scientific sections that should ALWAYS be processed
 * These sections contain valuable content even if the page also has references
 */
const IMPORTANT_SECTION_HEADERS = [
  // Conclusion patterns (ES/EN)
  /^(?:conclusi[oó]n(?:es)?|conclusions?)\s*$/im,
  // Complications (ES/EN)
  /^(?:complicaciones?|complications?)\s*$/im,
  // Limitations (ES/EN)
  /^(?:limitaciones?|limitations?)\s*$/im,
  // Discussion (ES/EN)
  /^(?:discusi[oó]n|discussion)\s*$/im,
  // Results (ES/EN)
  /^(?:resultados?|results?)\s*$/im,
  // Clinical implications (ES/EN)
  /^(?:implicaciones?\s+cl[íi]nicas?|clinical\s+implications?)\s*$/im,
  // Future research (ES/EN)
  /^(?:investigaci[oó]n\s+futura|future\s+research|direcciones?\s+futuras?)\s*$/im,
  // Recommendations (ES/EN)
  /^(?:recomendaciones?|recommendations?)\s*$/im,
  // Summary (ES/EN) - not to be confused with abstract at start
  /^(?:resumen\s+(?:final|de\s+hallazgos)|summary\s+(?:of\s+findings)?)\s*$/im,
  // Key points / Take-home messages
  /^(?:puntos?\s+clave|key\s+points?|mensajes?\s+(?:clave|principales?))\s*$/im,
];

/**
 * Patterns that indicate a reference/bibliography page
 */
const REFERENCE_PATTERNS = {
  // Section headers for references
  headers: [
    /^references?\s*$/im,
    /^referencias?\s*$/im,
    /^bibliography\s*$/im,
    /^bibliografía\s*$/im,
    /^works?\s+cited\s*$/im,
    /^cited\s+references?\s*$/im,
    /^literature\s+cited\s*$/im,
  ],

  // Numbered reference entries (e.g., "1. Author Name..." or "18. Shaw JE...")
  numberedEntries: /^\s*\d{1,3}\.\s+[A-Z][a-záéíóúñ]+/gm,

  // DOI patterns (both text and URL format)
  doi: /(?:doi[:\s]*10\.\d{4,}|doi\.org\/10\.\d{4,}|https?:\/\/doi\.org\/10\.\d{4,})/gi,

  // PMID patterns
  pmid: /pmid[:\s]*\d{6,}/gi,

  // PubMed URLs
  pubmedUrl: /pubmed\.ncbi\.nlm\.nih\.gov\/\d+/gi,

  // Journal volume/issue patterns (e.g., "2020;45(3):123-456" or "2010; 87(1):4–14")
  journalCitation: /\d{4}\s*;\s*\d+\s*\(\s*\d+\s*\)\s*:\s*\d+/g,

  // Author-year patterns (e.g., "Smith J, Jones A. Title. Journal. 2020")
  authorYear: /[A-Z][a-z]+\s+[A-Z]{1,2}(?:,\s*[A-Z][a-z]+\s+[A-Z]{1,2})*\s*\.\s*[^.]+\.\s*[A-Z][a-z]+/g,

  // ISSN patterns
  issn: /ISSN[:\s]*\d{4}-\d{3}[\dX]/gi,

  // et al. patterns (common in citations)
  etAl: /et\s+al\.?/gi,

  // Year followed by semicolon (common in journal citations like "2018; 14(2)")
  yearSemicolon: /(?:19|20)\d{2}\s*;/g,
};

/**
 * Thresholds for detection
 */
const THRESHOLDS = {
  // Minimum DOI/PMID count to consider page as references
  minDOICount: 2,
  minPMIDCount: 2,

  // Minimum numbered entries to consider
  minNumberedEntries: 3,

  // Minimum percentage of text that looks like numbered entries
  minNumberedEntryRatio: 0.2,

  // Minimum journal citation patterns
  minJournalCitations: 2,

  // Minimum et al. occurrences
  minEtAlCount: 2,

  // Minimum year;semicolon patterns (very common in references)
  minYearSemicolons: 3,

  // If header found, lower threshold for other patterns
  headerMultiplier: 0.5,
};

/**
 * Detects if a page is primarily a reference/bibliography page
 *
 * @param {string} pageText - The text content of the page
 * @param {number} pageNumber - The page number (for logging)
 * @returns {Object} Detection result with confidence and reasons
 */
export function detectReferencePage(pageText, pageNumber) {
  if (!pageText || typeof pageText !== 'string') {
    return {
      isReferencePage: false,
      confidence: 0,
      reasons: [],
      pageNumber
    };
  }

  const text = pageText.trim();
  const reasons = [];
  let confidence = 0;

  // Check for reference section headers
  const hasHeader = REFERENCE_PATTERNS.headers.some(pattern => pattern.test(text));
  if (hasHeader) {
    reasons.push('Contains "References" or similar header');
    confidence += 0.3;
  }

  // Count DOIs
  const doiMatches = text.match(REFERENCE_PATTERNS.doi) || [];
  if (doiMatches.length >= THRESHOLDS.minDOICount) {
    reasons.push(`Contains ${doiMatches.length} DOI patterns`);
    confidence += Math.min(0.25, doiMatches.length * 0.05);
  }

  // Count PMIDs
  const pmidMatches = text.match(REFERENCE_PATTERNS.pmid) || [];
  if (pmidMatches.length >= THRESHOLDS.minPMIDCount) {
    reasons.push(`Contains ${pmidMatches.length} PMID patterns`);
    confidence += Math.min(0.25, pmidMatches.length * 0.05);
  }

  // Count numbered entries
  const numberedMatches = text.match(REFERENCE_PATTERNS.numberedEntries) || [];
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const numberedRatio = lines.length > 0 ? numberedMatches.length / lines.length : 0;

  if (numberedMatches.length >= THRESHOLDS.minNumberedEntries) {
    reasons.push(`Contains ${numberedMatches.length} numbered entries`);
    confidence += Math.min(0.25, numberedMatches.length * 0.04);
  }

  if (numberedRatio >= THRESHOLDS.minNumberedEntryRatio) {
    reasons.push(`${Math.round(numberedRatio * 100)}% numbered reference entries`);
    confidence += numberedRatio * 0.25;
  }

  // Count journal citation patterns
  const journalMatches = text.match(REFERENCE_PATTERNS.journalCitation) || [];
  if (journalMatches.length >= THRESHOLDS.minJournalCitations) {
    reasons.push(`Contains ${journalMatches.length} journal citation patterns`);
    confidence += Math.min(0.25, journalMatches.length * 0.05);
  }

  // Count year;semicolon patterns (very reliable indicator)
  const yearSemicolonMatches = text.match(REFERENCE_PATTERNS.yearSemicolon) || [];
  if (yearSemicolonMatches.length >= THRESHOLDS.minYearSemicolons) {
    reasons.push(`Contains ${yearSemicolonMatches.length} year-citation patterns`);
    confidence += Math.min(0.25, yearSemicolonMatches.length * 0.04);
  }

  // Count "et al." occurrences
  const etAlMatches = text.match(REFERENCE_PATTERNS.etAl) || [];
  if (etAlMatches.length >= THRESHOLDS.minEtAlCount) {
    reasons.push(`Contains ${etAlMatches.length} "et al." occurrences`);
    confidence += Math.min(0.2, etAlMatches.length * 0.03);
  }

  // Count PubMed URLs
  const pubmedMatches = text.match(REFERENCE_PATTERNS.pubmedUrl) || [];
  if (pubmedMatches.length >= 1) {
    reasons.push(`Contains ${pubmedMatches.length} PubMed URLs`);
    confidence += Math.min(0.2, pubmedMatches.length * 0.05);
  }

  // Boost confidence if header is present
  if (hasHeader && confidence > 0.2) {
    confidence = Math.min(1.0, confidence * 1.3);
  }

  // Boost confidence for pages that have multiple reference indicators together
  // (numbered entries + journal citations + et al. is a very strong signal)
  const signalCount = [
    numberedMatches.length >= THRESHOLDS.minNumberedEntries,
    journalMatches.length >= THRESHOLDS.minJournalCitations,
    etAlMatches.length >= THRESHOLDS.minEtAlCount,
    doiMatches.length >= THRESHOLDS.minDOICount,
    pmidMatches.length >= THRESHOLDS.minPMIDCount,
    yearSemicolonMatches.length >= THRESHOLDS.minYearSemicolons
  ].filter(Boolean).length;

  if (signalCount >= 3) {
    reasons.push(`Multiple reference signals (${signalCount}/6)`);
    confidence = Math.min(1.0, confidence + 0.15);
  }

  // Cap confidence at 1.0
  confidence = Math.min(1.0, confidence);

  // Decision: page is references if confidence >= 0.5
  const isReferencePage = confidence >= 0.5;

  return {
    isReferencePage,
    confidence: Math.round(confidence * 100) / 100,
    reasons,
    pageNumber,
    stats: {
      doiCount: doiMatches.length,
      pmidCount: pmidMatches.length,
      numberedEntries: numberedMatches.length,
      journalCitations: journalMatches.length,
      etAlCount: etAlMatches.length,
      pubmedUrls: pubmedMatches.length,
      yearSemicolons: yearSemicolonMatches.length,
      signalCount
    }
  };
}

/**
 * Generates a standardized response for reference pages
 * This prevents AI from being called and potentially hallucinating
 *
 * @param {number} pageNumber - The page number
 * @param {Object} detection - The detection result from detectReferencePage
 * @returns {string} A standardized response message
 */
export function generateReferencePageResponse(pageNumber, detection) {
  const reasonsList = detection.reasons.length > 0
    ? ` (${detection.reasons.join(', ')})`
    : '';

  return `[Esta página (${pageNumber}) contiene referencias bibliográficas${reasonsList}. ` +
    `No hay contenido médico sustantivo para resumir. ` +
    `Confianza de detección: ${Math.round(detection.confidence * 100)}%]`;
}

/**
 * Checks if text has substantive medical content worth analyzing
 * Used as a secondary check before sending to AI
 *
 * @param {string} text - The page text
 * @returns {Object} Result with hasContent boolean and reason
 */
export function hasSubstantiveContent(text) {
  if (!text || typeof text !== 'string') {
    return { hasContent: false, reason: 'No text provided' };
  }

  const trimmed = text.trim();

  // Too short to have substantive content
  if (trimmed.length < 100) {
    return { hasContent: false, reason: 'Text too short (< 100 chars)' };
  }

  // Check for common medical content indicators
  const contentIndicators = [
    /\b(study|studies|research|trial|cohort)\b/i,
    /\b(estudio|estudios|investigación|ensayo|cohorte)\b/i,
    /\b(patient|patients|participant|participants)\b/i,
    /\b(paciente|pacientes|participante|participantes)\b/i,
    /\b(result|results|outcome|outcomes|finding|findings)\b/i,
    /\b(resultado|resultados|hallazgo|hallazgos)\b/i,
    /\b(method|methods|methodology)\b/i,
    /\b(método|métodos|metodología)\b/i,
    /\b(conclusion|conclusions|discussion)\b/i,
    /\b(conclusión|conclusiones|discusión)\b/i,
    /\b(treatment|therapy|intervention)\b/i,
    /\b(tratamiento|terapia|intervención)\b/i,
    /\b(diagnosis|diagnostic|prognosis)\b/i,
    /\b(diagnóstico|pronóstico)\b/i,
    /\b(p\s*[<>=]\s*0\.\d+)\b/i,  // p-values
    /\b(CI\s*[:=]?\s*\d+\.?\d*\s*[-–]\s*\d+\.?\d*)\b/i,  // Confidence intervals
    /\b(OR|RR|HR)\s*[:=]?\s*\d+\.?\d*/i,  // Odds ratio, risk ratio, hazard ratio
  ];

  const matchedIndicators = contentIndicators.filter(pattern => pattern.test(trimmed));

  if (matchedIndicators.length >= 2) {
    return { hasContent: true, reason: `Found ${matchedIndicators.length} content indicators` };
  }

  // Check if mostly reference-like content
  const refCheck = detectReferencePage(trimmed, 0);
  if (refCheck.isReferencePage) {
    return { hasContent: false, reason: 'Page detected as references' };
  }

  // Default: assume it has content if it's long enough and not detected as references
  if (trimmed.length > 500) {
    return { hasContent: true, reason: 'Sufficient text length' };
  }

  return { hasContent: false, reason: 'Insufficient content indicators' };
}

/**
 * Finds important section headers in the text
 *
 * @param {string} text - The page text
 * @returns {Array} Array of found important sections with their positions
 */
export function findImportantSections(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const sections = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    for (const pattern of IMPORTANT_SECTION_HEADERS) {
      if (pattern.test(line)) {
        // Calculate character position
        const position = lines.slice(0, i).join('\n').length + 1;
        sections.push({
          name: line,
          lineIndex: i,
          position: position
        });
        break; // Only match one pattern per line
      }
    }
  }

  return sections;
}

/**
 * Finds the start position of the References section in the text
 *
 * @param {string} text - The page text
 * @returns {Object|null} Object with position info or null if not found
 */
export function findReferencesSectionStart(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check against reference header patterns
    for (const pattern of REFERENCE_PATTERNS.headers) {
      if (pattern.test(line)) {
        // Calculate character position
        const position = lines.slice(0, i).join('\n').length;
        return {
          headerText: line,
          lineIndex: i,
          position: position
        };
      }
    }
  }

  return null;
}

/**
 * Extracts content before the References section
 *
 * @param {string} text - The full page text
 * @param {Object} refSection - Reference section info from findReferencesSectionStart
 * @returns {string} Text content before references
 */
export function extractContentBeforeReferences(text, refSection) {
  if (!refSection || refSection.position <= 0) {
    return text;
  }

  const contentBefore = text.substring(0, refSection.position).trim();
  return contentBefore;
}

/**
 * Analyzes page content and classifies it into three categories:
 * - PURE_REFERENCES: Page is primarily references, skip entirely
 * - MIXED_CONTENT: Page has both important content AND references, extract content only
 * - SUBSTANTIVE_CONTENT: Page has normal content, process fully
 *
 * @param {string} pageText - The text content of the page
 * @param {number} pageNumber - The page number (for logging/tracking)
 * @returns {Object} Analysis result with classification and extractable text
 */
export function analyzePageContent(pageText, pageNumber) {
  // Default result for invalid input
  if (!pageText || typeof pageText !== 'string') {
    return {
      classification: PAGE_CLASSIFICATION.SUBSTANTIVE_CONTENT,
      pageNumber,
      importantSections: [],
      referenceSection: null,
      extractableText: '',
      originalText: '',
      confidence: 0,
      reasons: ['No text provided']
    };
  }

  const text = pageText.trim();
  const reasons = [];

  // Step 1: Find important sections (Conclusion, Limitations, etc.)
  const importantSections = findImportantSections(text);

  // Step 2: Find references section start
  const referenceSection = findReferencesSectionStart(text);

  // Step 3: Calculate reference metrics using existing detection
  const refMetrics = detectReferencePage(text, pageNumber);

  // Step 4: Classification logic

  // Case A.0: If there's a References header, always check for content before it
  // This handles pages where content before references doesn't have explicit headers
  // but still has valuable medical content
  if (referenceSection && importantSections.length === 0) {
    const textBeforeRef = extractContentBeforeReferences(text, referenceSection);

    // Check if there's substantial content before the References section
    // Must have meaningful length AND pass substantive content check
    if (textBeforeRef.length >= 150) {
      const contentCheck = hasSubstantiveContent(textBeforeRef);

      // Additional check: the content should not itself be detected as references
      const preRefCheck = detectReferencePage(textBeforeRef, pageNumber);

      if (contentCheck.hasContent && !preRefCheck.isReferencePage) {
        reasons.push('References header found with substantive content before it');
        reasons.push(`Pre-reference content: ${textBeforeRef.length} chars`);

        return {
          classification: PAGE_CLASSIFICATION.MIXED_CONTENT,
          pageNumber,
          importantSections: [],
          referenceSection,
          extractableText: textBeforeRef,
          originalText: text,
          confidence: 0.8,
          reasons,
          refStats: refMetrics.stats
        };
      }
    }
  }

  // Case A: Has important sections
  if (importantSections.length > 0) {
    reasons.push(`Found important sections: ${importantSections.map(s => s.name).join(', ')}`);

    // Check if there's also a references section
    if (referenceSection) {
      // MIXED_CONTENT: Important content + References on same page
      const extractableText = extractContentBeforeReferences(text, referenceSection);

      // Verify the extracted content is substantial
      if (extractableText.length >= 100) {
        reasons.push(`References section found at line ${referenceSection.lineIndex + 1}`);
        reasons.push(`Extracted ${extractableText.length} chars of content before references`);

        return {
          classification: PAGE_CLASSIFICATION.MIXED_CONTENT,
          pageNumber,
          importantSections,
          referenceSection,
          extractableText,
          originalText: text,
          confidence: 0.9,
          reasons,
          refStats: refMetrics.stats
        };
      }
    }

    // Has important sections but no references (or references are negligible)
    return {
      classification: PAGE_CLASSIFICATION.SUBSTANTIVE_CONTENT,
      pageNumber,
      importantSections,
      referenceSection: null,
      extractableText: text,
      originalText: text,
      confidence: 0.85,
      reasons,
      refStats: refMetrics.stats
    };
  }

  // Case B: No important sections, but check if it's a pure reference page
  if (refMetrics.isReferencePage && refMetrics.confidence >= 0.5) {
    // Additional check: if there's a reference header, and most content comes after it
    if (referenceSection) {
      const textBeforeRef = text.substring(0, referenceSection.position).trim();

      // If there's substantial content before the References header, it might be MIXED
      if (textBeforeRef.length >= 200) {
        // Check if the content before references has any value
        const contentCheck = hasSubstantiveContent(textBeforeRef);
        if (contentCheck.hasContent) {
          reasons.push('Content found before References section');
          reasons.push(`Pre-reference content: ${textBeforeRef.length} chars`);

          return {
            classification: PAGE_CLASSIFICATION.MIXED_CONTENT,
            pageNumber,
            importantSections: [],
            referenceSection,
            extractableText: textBeforeRef,
            originalText: text,
            confidence: 0.75,
            reasons,
            refStats: refMetrics.stats
          };
        }
      }
    }

    // Pure references page
    reasons.push(...refMetrics.reasons);
    return {
      classification: PAGE_CLASSIFICATION.PURE_REFERENCES,
      pageNumber,
      importantSections: [],
      referenceSection,
      extractableText: '',
      originalText: text,
      confidence: refMetrics.confidence,
      reasons,
      refStats: refMetrics.stats
    };
  }

  // Case C: Normal substantive content
  return {
    classification: PAGE_CLASSIFICATION.SUBSTANTIVE_CONTENT,
    pageNumber,
    importantSections,
    referenceSection: null,
    extractableText: text,
    originalText: text,
    confidence: 0.8,
    reasons: ['Normal content page'],
    refStats: refMetrics.stats
  };
}

/**
 * Generates a response message for mixed content pages
 *
 * @param {number} pageNumber - The page number
 * @param {Object} analysis - The analysis result from analyzePageContent
 * @returns {string} A descriptive message about the mixed content handling
 */
export function generateMixedContentResponse(pageNumber, analysis) {
  const sectionsFound = analysis.importantSections.length > 0
    ? analysis.importantSections.map(s => s.name).join(', ')
    : 'contenido previo';

  return `[Página ${pageNumber}: Contenido mixto detectado. ` +
    `Secciones importantes encontradas: ${sectionsFound}. ` +
    `Se procesó el contenido médico (${analysis.extractableText.length} caracteres) ` +
    `omitiendo la sección de referencias bibliográficas.]`;
}

export default {
  detectReferencePage,
  generateReferencePageResponse,
  hasSubstantiveContent,
  analyzePageContent,
  generateMixedContentResponse,
  findImportantSections,
  findReferencesSectionStart,
  extractContentBeforeReferences,
  PAGE_CLASSIFICATION,
  REFERENCE_PATTERNS,
  THRESHOLDS,
  IMPORTANT_SECTION_HEADERS
};
