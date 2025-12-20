/**
 * PDF Controller - Orquestación Principal del Procesamiento
 *
 * Este controlador implementa la lógica central que replica el script Python:
 * 1. Recibe archivo PDF via upload
 * 2. Configura SSE para logs en tiempo real
 * 3. Orquesta: PDF -> Texto -> Estructura -> Análisis IA -> Resumen
 * 4. Retorna estructura JSON con conocimiento organizado
 *
 * Legacy Note: Este controlador reemplaza la función main() del script Python:
 *   def main(pdf_path, output_dir):
 *       doc = fitz.open(pdf_path)
 *       for page in tqdm(doc, desc="Processing"):
 *           analyze_page(page)
 *       generate_summary()
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import multer from 'multer';
import pdfService from '../services/pdfService.js';
import aiService from '../services/aiService.js';
import structureService from '../services/structureService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../uploads');

// Asegurar que existe el directorio de uploads
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuración de multer para uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${randomUUID()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

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
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const sendLog = (text, color = 'white') => {
    sendEvent({ type: 'log', text, color, timestamp: new Date().toISOString() });
  };

  try {
    // Verificar que se subió un archivo (multer.single guarda en req.file)
    if (!req.file) {
      sendLog('✗ No PDF file uploaded', 'red');
      sendEvent({ type: 'error', message: 'No file uploaded' });
      return res.end();
    }

    const pdfFile = req.file;
    const pdfPath = pdfFile.path;
    const fileName = pdfFile.originalname;

    sendLog(`📥 File received: ${fileName}`, 'green');
    sendLog(`📁 Temporary path: ${pdfPath}`, 'gray');

    // Paso 1: Extraer texto del PDF
    sendLog('='.repeat(50), 'gray');
    sendLog('STEP 1: PDF Text Extraction', 'yellow');
    sendLog('='.repeat(50), 'gray');

    const pdfData = await pdfService.extractTextFromPDF(pdfPath, sendLog);

    // Paso 2: Dividir en páginas
    sendLog('='.repeat(50), 'gray');
    sendLog('STEP 2: Page Segmentation', 'yellow');
    sendLog('='.repeat(50), 'gray');

    const pages = pdfService.splitIntoPages(pdfData.text, pdfData.numpages);
    sendLog(`✓ Document split into ${pages.length} pages`, 'green');

    // Paso 3: Detectar estructura del documento
    sendLog('='.repeat(50), 'gray');
    sendLog('STEP 3: Structure Detection', 'yellow');
    sendLog('='.repeat(50), 'gray');

    const structure = pdfService.detectStructure(pages, sendLog);

    // Paso 4: Analizar cada página con IA
    sendLog('='.repeat(50), 'gray');
    sendLog('STEP 4: AI Page Analysis', 'yellow');
    sendLog('='.repeat(50), 'gray');

    const analyzedPages = [];
    let progress = 0;
    const progressStep = 50 / pages.length; // 50% del progreso total

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      sendLog(`Processing page ${i + 1}/${pages.length} (Page ${page.pageNumber})`, 'cyan');

      try {
        const analysis = await aiService.analyzePage(page.text, page.pageNumber, sendLog);
        analyzedPages.push({
          pageNumber: page.pageNumber,
          analysis,
          text: page.text.substring(0, 500) // Preview del texto
        });
      } catch (error) {
        sendLog(`⚠ Skipping page ${page.pageNumber} due to error`, 'orange');
        analyzedPages.push({
          pageNumber: page.pageNumber,
          analysis: `[Error analyzing page: ${error.message}]`,
          text: page.text.substring(0, 500)
        });
      }

      // Actualizar progreso
      progress += progressStep;
      sendEvent({ type: 'progress', percent: Math.round(progress) });
    }

    // Paso 5: Generar resumen estructurado IMRyD
    sendLog('='.repeat(50), 'gray');
    sendLog('STEP 5: Generate IMRyD Summary', 'yellow');
    sendLog('='.repeat(50), 'gray');

    const title = pdfData.metadata?.Title || fileName.replace('.pdf', '');

    // Agrupar análisis por estructura
    const groupedAnalysis = structureService.groupAnalysisByStructure(analyzedPages, structure);

    // Generar resumen final
    const summaryMarkdown = await aiService.generateSummary(title, analyzedPages, sendLog);

    // Enviar progreso final
    sendEvent({ type: 'progress', percent: 100 });

    // Paso 6: Organizar resultado final
    sendLog('='.repeat(50), 'gray');
    sendLog('STEP 6: Final Organization', 'yellow');
    sendLog('='.repeat(50), 'gray');

    const result = {
      title,
      fileName,
      totalPages: pages.length,
      structure,
      pages: analyzedPages,
      summary: summaryMarkdown,
      groupedContent: groupedAnalysis,
      metadata: pdfData.metadata,
      processedAt: new Date().toISOString()
    };

    // Construir árbol de archivos para el frontend
    const fileTree = structureService.buildFileTree(result);

    sendLog('✓ Processing complete!', 'green');
    sendEvent({ type: 'complete', result: { ...result, fileTree } });

    // Limpiar archivo temporal
    fs.unlink(pdfPath, (err) => {
      if (err) sendLog(`⚠ Could not delete temp file: ${err.message}`, 'orange');
    });

  } catch (error) {
    sendLog(`✗ Critical error: ${error.message}`, 'red');
    sendLog(error.stack, 'red');
    sendEvent({ type: 'error', message: error.message });
  } finally {
    // Cerrar conexión SSE
    res.end();
  }
}

// Export default con ambas funciones
export default { processPDF, upload };
