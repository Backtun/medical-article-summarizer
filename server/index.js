/**
 * Medical Summarizer - Servidor Principal
 *
 * Este archivo configura el servidor Express con:
 * - Server-Sent Events (SSE) para logs en tiempo real
 * - API REST para procesamiento de PDFs
 * - CORS y manejo de archivos subidos
 * - Rate limiting para protección contra abuso
 * - Security headers
 * - Structured logging with correlation IDs
 */

import path from 'path';
import {
  fileURLToPath
} from 'url';
import express from 'express';
import cors from 'cors';
import './config/env.js';
import pdfController from './controllers/pdfController.js';
import {
  apiLimiter,
  uploadLimiter
} from './middleware/rateLimiter.js';
import {
  getCacheStats,
  clearAllCaches
} from './services/cacheService.js';
import {
  requestLogger
} from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || process.env.SITE_URL || 'http://localhost:5173';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ============================================
// Security Middleware
// ============================================

// Disable x-powered-by header
app.disable('x-powered-by');

// Security headers (helmet-like)
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy (basic)
  if (IS_PRODUCTION) {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;");
  }
  next();
});

// CORS configuration
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({
  limit: '1mb'
}));
app.use(express.urlencoded({
  extended: true,
  limit: '1mb'
}));

// Disable buffering for SSE streams
app.set('etag', false);

// ============================================
// Rate Limiting
// ============================================

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// ============================================
// API Routes
// ============================================

// PDF processing endpoint with stricter rate limiting
app.post('/api/process',
  uploadLimiter,
  pdfController.upload.single('pdf'),
  pdfController.processPDF
);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  // Check Ollama if configured
  let ollamaStatus = 'not_configured';
  if (process.env.USE_OLLAMA === 'true') {
    try {
      const {
        isOllamaAvailable
      } = await import('./services/ollamaService.js');
      ollamaStatus = (await isOllamaAvailable()) ? 'available' : 'unavailable';
    } catch {
      ollamaStatus = 'error';
    }
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      chutes: process.env.CHUTES_API_KEY ? 'configured' : 'not_configured',
      ollama: ollamaStatus
    }
  });
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Medical Article Summarizer',
    version: '1.0.0',
    disclaimer: '⚠️ Este servicio es informativo y no constituye consejo médico. Consulte siempre con un profesional de la salud.',
    limits: {
      maxFileSize: '50MB',
      maxPages: Number(process.env.MAX_PAGES) || 100,
      rateLimit: '5 cargas por minuto',
      parsingTimeout: `${(Number(process.env.PARSING_TIMEOUT_MS) || 60000) / 1000}s`
    },
    features: {
      imrydDetection: true,
      antiHallucinationPrompts: process.env.USE_PROMPTS_V2 === 'true',
      caching: true,
      exportFormats: ['markdown', 'json', 'html'],
      localLLM: process.env.USE_OLLAMA === 'true'
    }
  });
});

// Cache stats endpoint (development only)
if (!IS_PRODUCTION) {
  app.get('/api/cache/stats', (req, res) => {
    res.json(getCacheStats());
  });

  app.post('/api/cache/clear', (req, res) => {
    clearAllCaches();
    res.json({
      message: 'Caché limpiada',
      timestamp: new Date().toISOString()
    });
  });

  // Job queue stats (development only)
  app.get('/api/jobs/stats', async (req, res) => {
    try {
      const {
        getJobStats
      } = await import('./services/jobQueue.js');
      res.json(getJobStats());
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  // Get specific job status
  app.get('/api/jobs/:jobId', async (req, res) => {
    try {
      const {
        getJob
      } = await import('./services/jobQueue.js');
      const job = getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({
          error: 'Trabajo no encontrado'
        });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  // Ollama status endpoint
  app.get('/api/ollama/status', async (req, res) => {
    try {
      const {
        getStatus
      } = await import('./services/ollamaService.js');
      res.json(await getStatus());
    } catch (error) {
      res.status(500).json({
        error: error.message,
        available: false
      });
    }
  });
}

// Request logging (structured logging)
app.use(requestLogger);

// ============================================
// Frontend (Production)
// ============================================

if (IS_PRODUCTION) {
  const __dirname = path.dirname(fileURLToPath(
    import.meta.url));
  const clientDistPath = path.resolve(__dirname, '../client/dist');

  app.use(express.static(clientDistPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'No encontrado',
    message: `Ruta ${req.method} ${req.path} no encontrada`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Log full error server-side
  console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.path}:`, err);

  // Determine status code
  const statusCode = err.status || err.statusCode || 500;

  // Sanitize error message for production
  const message = IS_PRODUCTION ?
    (statusCode === 500 ? 'Error interno del servidor' : err.message) :
    err.message;

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Error interno del servidor' : 'Error',
    message,
    ...(IS_PRODUCTION ? {} : {
      stack: err.stack
    })
  });
});

// ============================================
// Server Startup
// ============================================

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🏥 Medical Summarizer Server v1.0.0`);
  console.log('='.repeat(50));
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${IS_PRODUCTION ? 'production' : 'development'}`);
  console.log(`🤖 Model: ${process.env.MODEL || 'zai-org/GLM-4.7-TEE'}`);

  if (!process.env.CHUTES_API_KEY) {
    console.warn('⚠️  Missing CHUTES_API_KEY. The API will fail until it is set.');
  } else {
    console.log('✅ Chutes AI Key configured');
  }

  console.log('='.repeat(50));
  console.log('⚠️  DISCLAIMER: Este servicio es informativo y no constituye consejo médico.');
  console.log('='.repeat(50));
});

export default app;