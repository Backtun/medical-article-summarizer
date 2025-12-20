/**
 * Medical Summarizer - Servidor Principal
 *
 * Este archivo configura el servidor Express con:
 * - Server-Sent Events (SSE) para logs en tiempo real
 * - API REST para procesamiento de PDFs
 * - CORS y manejo de archivos subidos
 */

import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import './config/env.js';
import pdfController from './controllers/pdfController.js';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || process.env.SITE_URL || 'http://localhost:5173';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Middleware
app.disable('x-powered-by');
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Deshabilitar el buffering para streams
app.set('etag', false);

// Rutas API - con middleware multer para upload
app.post('/api/process', pdfController.upload.single('pdf'), pdfController.processPDF);

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Frontend en producción (SPA)
if (IS_PRODUCTION) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDistPath = path.resolve(__dirname, '../client/dist');

  app.use(express.static(clientDistPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Medical Summarizer Server running on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠ Missing OPENAI_API_KEY. The API will fail until it is set.');
  }
  console.log(`OpenRouter Model: ${process.env.MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free'}`);
});

export default app;
