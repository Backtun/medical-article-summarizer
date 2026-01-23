/**
 * PDF Controller - Orquestación Principal del Procesamiento
 *
 * Este controlador implementa la lógica central:
 * 1. Recibe archivo PDF via upload con validación de seguridad
 * 2. Configura SSE para logs en tiempo real
 * 3. Orquesta: PDF -> Texto -> Estructura -> Análisis IA -> Resumen
 * 4. Retorna estructura JSON con conocimiento organizado
 *
 * Security Features:
 * - PDF magic byte validation
 * - Page count limits
 * - Parsing timeout
 * - Sanitized logging
 */

import fs from 'fs';
import path from 'path';
import {
  fileURLToPath
} from 'url';
import {
  randomUUID,
  createHash
} from 'crypto';
import multer from 'multer';
import '../config/env.js';
import pdfService from '../services/pdfService.js';
import aiService from '../services/aiService.js';
import structureService from '../services/structureService.js';
import pdfValidator from '../utils/pdfValidator.js';
import referenceDetector from '../utils/referenceDetector.js';

const __dirname = path.dirname(fileURLToPath(
  import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const CLIENT_URL = process.env.CLIENT_URL || process.env.SITE_URL || 'http://localhost:5173';

// Configuration
const MAX_PAGES = parseInt(process.env.MAX_PAGES || '100', 10);
const PARSING_TIMEOUT_MS = parseInt(process.env.PARSING_TIMEOUT_MS || '60000', 10);

// Asegurar que existe el directorio de uploads
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, {
    recursive: true
  });
}

// Configuración de multer para uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Use only UUID for filename (security: avoid path traversal via originalname)
  filename: (req, file, cb) => cb(null, `${randomUUID()}.pdf`)
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024
  }, // 50MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

/**
 * Calculate SHA256 hash of a file for caching purposes
 * @param {string} filePath - Path to file
 * @returns {string} - Hex hash
 */
function calculateFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Procesa un PDF y genera resúmenes estructurados
 * Implementa Server-Sent Events (SSE) para feedback en tiempo real
 *
 * @route POST /api/process
 * @param {File} file - Archivo PDF subido
 * @returns {SSE Stream} - Logs de progreso y resultado final
 */
export async function processPDF(req, res) {
  // Configurar headers para SSE
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', CLIENT_URL);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (res.flushHeaders) res.flushHeaders();
  res.write(':\n\n');

  let clientClosed = false;
  req.on('close', () => {
    clientClosed = true;
  });

  const safeWrite = (payload) => {
    if (clientClosed || res.writableEnded) return;
    res.write(payload);
  };

  const sendEvent = (data) => {
    safeWrite(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Sanitized logging - don't expose internal paths to client
  const sendLog = (text, color = 'white') => {
    // Sanitize: remove file paths from logs
    const sanitizedText = text.replace(/\/[\w\/\-\.]+/g, '[path]');
    sendEvent({
      type: 'log',
      text: sanitizedText,
      color,
      timestamp: new Date().toISOString()
    });
  };

  let pdfPath = null;

  try {
    // Verificar que se subió un archivo
    if (!req.file) {
      sendLog('✗ No se subió ningún archivo PDF', 'red');
      sendEvent({
        type: 'error',
        message: 'No se subió ningún archivo'
      });
      return;
    }

    const pdfFile = req.file;
    pdfPath = pdfFile.path;
    const fileName = pdfFile.originalname;

    sendLog(`📥 Archivo recibido: ${fileName}`, 'green');

    // ========================================
    // VALIDACIÓN DE SEGURIDAD
    // ========================================
    sendLog('🔒 Validando seguridad del PDF...', 'cyan');

    // Validate PDF magic bytes
    try {
      pdfValidator.validatePDFMagicBytes(pdfPath);
      sendLog('✓ Formato PDF validado', 'green');
    } catch (error) {
      sendLog(`✗ PDF inválido: ${error.message}`, 'red');
      sendEvent({
        type: 'error',
        message: 'Formato de archivo PDF inválido'
      });
      return;
    }

    // Calculate file hash for potential caching
    const fileHash = calculateFileHash(pdfPath);
    sendLog(`📋 Hash del documento: ${fileHash.substring(0, 12)}...`, 'gray');

    // ========================================
    // PASO 1: Extracción de texto del PDF (con timeout)
    // ========================================
    sendLog('='.repeat(50), 'gray');
    sendLog('PASO 1: Extracción de texto del PDF', 'yellow');
    sendLog('='.repeat(50), 'gray');

    // Wrap extraction with timeout
    let pdfData;
    try {
      pdfData = await pdfValidator.withTimeout(
        pdfService.extractTextFromPDF(pdfPath, sendLog),
        PARSING_TIMEOUT_MS,
        'PDF extraction'
      );
    } catch (error) {
      if (error.message.includes('timed out')) {
        sendLog(`✗ Extracción del PDF agotó el tiempo después de ${PARSING_TIMEOUT_MS / 1000}s`, 'red');
        sendEvent({
          type: 'error',
          message: 'Tiempo de procesamiento del PDF agotado. El archivo puede ser muy complejo o estar corrupto.'
        });
      } else {
        sendLog(`✗ Extracción del PDF falló: ${error.message}`, 'red');
        sendEvent({
          type: 'error',
          message: `Error al extraer texto: ${error.message}`
        });
      }
      return;
    }

    // ========================================
    // PASO 2: Segmentación de páginas
    // ========================================
    sendLog('='.repeat(50), 'gray');
    sendLog('PASO 2: Segmentación de páginas', 'yellow');
    sendLog('='.repeat(50), 'gray');

    const pages = (pdfData.pages && pdfData.pages.length > 0) ?
      pdfData.pages :
      pdfService.splitIntoPages(pdfData.text, pdfData.numpages);

    if (pages.length === 0) {
      sendLog('✗ No se detectaron páginas en el PDF', 'red');
      sendEvent({
        type: 'error',
        message: 'No se detectaron páginas en el PDF'
      });
      return;
    }

    // Validate page count
    try {
      pdfValidator.validatePageCount(pages.length, MAX_PAGES);
      sendLog(`✓ El documento tiene ${pages.length} páginas (límite: ${MAX_PAGES})`, 'green');
    } catch (error) {
      sendLog(`✗ ${error.message}`, 'red');
      sendEvent({
        type: 'error',
        message: error.message
      });
      return;
    }

    // ========================================
    // PASO 3: Detección de estructura
    // ========================================
    sendLog('='.repeat(50), 'gray');
    sendLog('PASO 3: Detección de estructura (IMRyD)', 'yellow');
    sendLog('='.repeat(50), 'gray');

    const structure = pdfService.detectStructure(pages, sendLog);

    // ========================================
    // PASO 4: Análisis de páginas con IA
    // ========================================
    sendLog('='.repeat(50), 'gray');
    sendLog('PASO 4: Análisis de páginas con IA', 'yellow');
    sendLog('='.repeat(50), 'gray');

    const analyzedPages = [];
    let progress = 0;
    const progressStep = pages.length > 0 ? 50 / pages.length : 0;

    for (let i = 0; i < pages.length; i++) {
      if (clientClosed) {
        return;
      }

      const page = pages[i];
      sendLog(`Procesando página ${i + 1}/${pages.length}`, 'cyan');

      try {
        const trimmed = (page.text && page.text.trim) ? page.text.trim() : '';

        // Check for empty or placeholder pages
        if (!trimmed || trimmed.startsWith('[Página')) {
          analyzedPages.push({
            pageNumber: page.pageNumber,
            analysis: '[Página omitida: sin texto extraíble]',
            text: '',
            isEmptyPage: true
          });
          sendLog(`⚠ Página ${page.pageNumber} omitida (sin texto extraíble)`, 'orange');
          continue;
        }

        // LAYER 1: Intelligent Content Analysis with Tripartite Classification
        // Detects: PURE_REFERENCES, MIXED_CONTENT, or SUBSTANTIVE_CONTENT
        const contentAnalysis = referenceDetector.analyzePageContent(trimmed, page.pageNumber);

        // Handle based on classification
        switch (contentAnalysis.classification) {
          case referenceDetector.PAGE_CLASSIFICATION.PURE_REFERENCES: {
            // Pure references page - skip AI entirely to prevent hallucination
            const referenceResponse = referenceDetector.generateReferencePageResponse(
              page.pageNumber,
              contentAnalysis
            );

            analyzedPages.push({
              pageNumber: page.pageNumber,
              analysis: referenceResponse,
              text: page.text.substring(0, 500),
              isReferencePage: true,
              contentClassification: contentAnalysis.classification,
              referenceDetection: {
                confidence: contentAnalysis.confidence,
                reasons: contentAnalysis.reasons,
                stats: contentAnalysis.refStats
              }
            });

            sendLog(
              `📚 Página ${page.pageNumber} detectada como referencias puras (${Math.round(contentAnalysis.confidence * 100)}% confianza) - omitiendo IA`,
              'yellow'
            );
            continue;
          }

          case referenceDetector.PAGE_CLASSIFICATION.MIXED_CONTENT: {
            // Mixed content: has important sections (Conclusion, Limitations, etc.) + References
            // Extract and process ONLY the substantive content, ignoring references section

            const extractedText = contentAnalysis.extractableText;
            const sectionsFound = contentAnalysis.importantSections.map(s => s.name).join(', ');

            sendLog(
              `🔀 Página ${page.pageNumber} tiene contenido mixto (${sectionsFound}) - extrayendo contenido sustantivo`,
              'cyan'
            );

            // Verify extracted content is worth processing
            if (extractedText.length < 100) {
              analyzedPages.push({
                pageNumber: page.pageNumber,
                analysis: `[Página omitida: contenido extraído insuficiente (${extractedText.length} caracteres)]`,
                text: page.text.substring(0, 500),
                isLowContent: true,
                contentClassification: contentAnalysis.classification
              });
              sendLog(`⚠ Página ${page.pageNumber} omitida (contenido extraído muy corto)`, 'orange');
              continue;
            }

            // Sanitize and process only the extracted substantive content
            const sanitizedText = pdfValidator.sanitizeTextForPrompt(extractedText);
            const analysis = await aiService.analyzePage(sanitizedText, page.pageNumber, sendLog);

            // Add note about mixed content processing
            const mixedContentNote = referenceDetector.generateMixedContentResponse(
              page.pageNumber,
              contentAnalysis
            );

            analyzedPages.push({
              pageNumber: page.pageNumber,
              analysis: analysis,
              text: extractedText.substring(0, 500),
              contentClassification: contentAnalysis.classification,
              mixedContentInfo: {
                sectionsFound: contentAnalysis.importantSections,
                originalLength: page.text.length,
                extractedLength: extractedText.length,
                note: mixedContentNote
              }
            });

            sendLog(
              `✓ Página ${page.pageNumber} procesada: ${extractedText.length}/${page.text.length} caracteres (referencias excluidas)`,
              'green'
            );
            continue;
          }

          case referenceDetector.PAGE_CLASSIFICATION.SUBSTANTIVE_CONTENT:
          default: {
            // Normal substantive content - process fully

            // LAYER 2: Additional check for substantive content quality
            const contentCheck = referenceDetector.hasSubstantiveContent(trimmed);

            if (!contentCheck.hasContent) {
              analyzedPages.push({
                pageNumber: page.pageNumber,
                analysis: `[Página omitida: ${contentCheck.reason}]`,
                text: page.text.substring(0, 500),
                isLowContent: true,
                contentClassification: contentAnalysis.classification
              });
              sendLog(`⚠ Página ${page.pageNumber} omitida (${contentCheck.reason})`, 'orange');
              continue;
            }

            // Page has substantive content - send to AI for analysis
            // Sanitize text before sending to AI (basic prompt injection protection)
            const sanitizedText = pdfValidator.sanitizeTextForPrompt(page.text);
            const analysis = await aiService.analyzePage(sanitizedText, page.pageNumber, sendLog);

            analyzedPages.push({
              pageNumber: page.pageNumber,
              analysis,
              text: page.text.substring(0, 500),
              contentClassification: contentAnalysis.classification
            });
          }
        }

      } catch (error) {
        sendLog(`⚠ Omitiendo página ${page.pageNumber} debido a error`, 'orange');
        analyzedPages.push({
          pageNumber: page.pageNumber,
          analysis: `[Error analizando página: ${error.message}]`,
          text: (page.text && page.text.substring) ? page.text.substring(0, 500) : ''
        });
      }

      progress += progressStep;
      sendEvent({
        type: 'progress',
        percent: Math.round(progress)
      });
    }

    if (clientClosed) {
      return;
    }

    // ========================================
    // PASO 5: Generar resumen IMRyD
    // ========================================
    sendLog('='.repeat(50), 'gray');
    sendLog('PASO 5: Generar resumen IMRyD', 'yellow');
    sendLog('='.repeat(50), 'gray');

    const title = (pdfData.metadata && pdfData.metadata.Title) ? pdfData.metadata.Title : fileName.replace('.pdf', '');
    const groupedAnalysis = structureService.groupAnalysisByStructure(analyzedPages, structure);
    const summaryMarkdown = await aiService.generateSummary(title, analyzedPages, sendLog);

    sendEvent({
      type: 'progress',
      percent: 100
    });

    // ========================================
    // PASO 6: Organización final
    // ========================================
    sendLog('='.repeat(50), 'gray');
    sendLog('PASO 6: Organización final', 'yellow');
    sendLog('='.repeat(50), 'gray');

    // Add mandatory disclaimer to summary
    const disclaimerSection = `

---

## ⚠️ Aviso Importante

> **Este resumen es informativo y no constituye consejo médico.**
> 
> - Generado automáticamente por inteligencia artificial
> - Verificar siempre la información con el documento original
> - Consultar con profesionales de la salud para decisiones clínicas
> - No utilizar como única fuente para diagnóstico o tratamiento

`;

    const result = {
      title,
      fileName,
      totalPages: pages.length,
      structure,
      pages: analyzedPages,
      summary: summaryMarkdown + disclaimerSection,
      groupedContent: groupedAnalysis,
      metadata: pdfData.metadata,
      processedAt: new Date().toISOString(),
      documentHash: fileHash.substring(0, 16),
      disclaimer: 'Este resumen es informativo y no constituye consejo médico. Consulte siempre con un profesional de la salud.'
    };

    const fileTree = structureService.buildFileTree(result);

    sendLog('✓ ¡Procesamiento completo!', 'green');
    sendLog('⚠️ Recuerde: Este resumen es informativo, no consejo médico.', 'yellow');
    sendEvent({
      type: 'complete',
      result: {
        ...result,
        fileTree
      }
    });

  } catch (error) {
    // Log sanitized error to client
    const sanitizedMessage = error.message.replace(/\/[\w\/\-\.]+/g, '[path]');
    sendLog(`✗ Error crítico: ${sanitizedMessage}`, 'red');
    sendEvent({
      type: 'error',
      message: sanitizedMessage
    });

    // Log full error server-side
    console.error('[PDF Controller Error]', error);
  } finally {
    // Always clean up uploaded file
    if (pdfPath) {
      fs.unlink(pdfPath, (err) => {
        if (err) {
          console.error(`[Cleanup] Could not delete temp file: ${err.message}`);
        }
      });
    }

    if (!res.writableEnded) res.end();
  }
}

export default {
  processPDF,
  upload
};