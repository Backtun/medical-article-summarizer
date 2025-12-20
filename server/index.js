/**
 * Medical Summarizer - Servidor Principal
 *
 * Este archivo configura el servidor Express con:
 * - Server-Sent Events (SSE) para logs en tiempo real
 * - API REST para procesamiento de PDFs
 * - CORS y manejo de archivos subidos
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pdfController from './controllers/pdfController.js';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Deshabilitar el buffering para streams
app.set('etag', false);

// Servir archivos subidos temporalmente
app.use('/uploads', express.static('uploads'));

// Rutas API - con middleware multer para upload
app.post('/api/process', pdfController.upload.single('pdf'), pdfController.processPDF);

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
  console.log(`OpenRouter Model: ${process.env.MODEL || 'openai/gpt-4o-mini'}`);
});

export default app;
