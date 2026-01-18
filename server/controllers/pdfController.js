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
      cb(new Error('Only PDF files are allowed'));
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
      sendLog('✗ No PDF file uploaded', 'red');
      sendEvent({
        type: 'error',
        message: 'No file uploaded'
      });
      return;
    }

    const pdfFile = req.file;
    pdfPath = pdfFile.path;
    const fileName = pdfFile.originalname;

    sendLog(`📥 File received: ${fileName}`, 'green');

    // ========================================
    // SECURITY VALIDATION
    // ========================================
    sendLog('🔒 Validating PDF security...', 'cyan');

    // Validate PDF magic bytes
    try {
      pdfValidator.validatePDFMagicBytes(pdfPath);
      sendLog('✓ PDF format validated', 'green');
    } catch (error) {
      sendLog(`✗ Invalid PDF: ${error.message}`, 'red');
      sendEvent({
        type: 'error',
        message: 'Invalid PDF file format'
      });
      return;
    }

    // Calculate file hash for potential caching
    const fileHash = calculateFileHash(pdfPath);
    sendLog(`📋 Document hash: ${fileHash.substring(0, 12)}...`, 'gray');

    // ========================================
    // STEP 1: PDF Text Extraction (with timeout)
    // ========================================
    sendLog('='.repeat(50), 'gray');
    sendLog('STEP 1: PDF Text Extraction', 'yellow');
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
        sendLog(`✗ PDF extraction timed out after ${PARSING_TIMEOUT_MS / 1000}s`, 'red');
        sendEvent({
          type: 'error',
          message: 'PDF processing timeout. The file may be too complex or corrupted.'
        });
      } else {
        sendLog(`✗ PDF extraction failed: ${error.message}`, 'red');
        sendEvent({
          type: 'error',
          message: `Failed to extract text: ${error.message}`
        });
      }
      return;
    }

    // ========================================
    // STEP 2: Page Segmentation
    // ========================================
    sendLog('='.repeat(50), 'gray');
    sendLog('STEP 2: Page Segmentation', 'yellow');
    sendLog('='.repeat(50), 'gray');

    const pages = (pdfData.pages && pdfData.pages.length > 0) ?
      pdfData.pages :
      pdfService.splitIntoPages(pdfData.text, pdfData.numpages);

    if (pages.length === 0) {
      sendLog('✗ No pages detected in PDF', 'red');
      sendEvent({
        type: 'error',
        message: 'No pages detected in PDF'
      });
      return;
    }

    // Validate page count
    try {
      pdfValidator.validatePageCount(pages.length, MAX_PAGES);
      sendLog(`✓ Document has ${pages.length} pages (limit: ${MAX_PAGES})`, 'green');
    } catch (error) {
      sendLog(`✗ ${error.message}`, 'red');
      sendEvent({
        type: 'error',
        message: error.message
      });
      return;
    }

    // ========================================
    // STEP 3: Structure Detection
    // ========================================
    sendLog('='.repeat(50), 'gray');
    sendLog('STEP 3: Structure Detection (IMRyD)', 'yellow');
    sendLog('='.repeat(50), 'gray');

    const structure = pdfService.detectStructure(pages, sendLog);

    // ========================================
    // STEP 4: AI Page Analysis
    // ========================================
    sendLog('='.repeat(50), 'gray');
    sendLog('STEP 4: AI Page Analysis', 'yellow');
    sendLog('='.repeat(50), 'gray');

    const analyzedPages = [];
    let progress = 0;
    const progressStep = pages.length > 0 ? 50 / pages.length : 0;

    for (let i = 0; i < pages.length; i++) {
      if (clientClosed) {
        return;
      }

      const page = pages[i];
      sendLog(`Processing page ${i + 1}/${pages.length}`, 'cyan');

      try {
        const trimmed = (page.text && page.text.trim) ? page.text.trim() : '';
        if (!trimmed || trimmed.startsWith('[Página')) {
          analyzedPages.push({
            pageNumber: page.pageNumber,
            analysis: '[Página omitida: sin texto extraíble]',
            text: ''
          });
          sendLog(`⚠ Page ${page.pageNumber} skipped (no extractable text)`, 'orange');
        } else {
          // Sanitize text before sending to AI (basic prompt injection protection)
          const sanitizedText = pdfValidator.sanitizeTextForPrompt(page.text);
          const analysis = await aiService.analyzePage(sanitizedText, page.pageNumber, sendLog);
          analyzedPages.push({
            pageNumber: page.pageNumber,
            analysis,
            text: page.text.substring(0, 500) // Preview only
          });
        }
      } catch (error) {
        sendLog(`⚠ Skipping page ${page.pageNumber} due to error`, 'orange');
        analyzedPages.push({
          pageNumber: page.pageNumber,
          analysis: `[Error analyzing page: ${error.message}]`,
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
    // STEP 5: Generate IMRyD Summary
    // ========================================
    sendLog('='.repeat(50), 'gray');
    sendLog('STEP 5: Generate IMRyD Summary', 'yellow');
    sendLog('='.repeat(50), 'gray');

    const title = (pdfData.metadata && pdfData.metadata.Title) ? pdfData.metadata.Title : fileName.replace('.pdf', '');
    const groupedAnalysis = structureService.groupAnalysisByStructure(analyzedPages, structure);
    const summaryMarkdown = await aiService.generateSummary(title, analyzedPages, sendLog);

    sendEvent({
      type: 'progress',
      percent: 100
    });

    // ========================================
    // STEP 6: Final Organization
    // ========================================
    sendLog('='.repeat(50), 'gray');
    sendLog('STEP 6: Final Organization', 'yellow');
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

    sendLog('✓ Processing complete!', 'green');
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
    sendLog(`✗ Critical error: ${sanitizedMessage}`, 'red');
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