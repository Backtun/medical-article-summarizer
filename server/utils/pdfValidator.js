/**
 * PDF Validator - Security Utilities
 *
 * Validates PDF files beyond MIME type checking to prevent
 * malicious file uploads and resource exhaustion attacks.
 */

import fs from 'fs';

// PDF magic bytes: %PDF-
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]);

// Configuration
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PAGES = 100;
const PARSING_TIMEOUT_MS = 60 * 1000; // 60 seconds

/**
 * Validates that a file is a genuine PDF by checking magic bytes
 * @param {string} filePath - Path to the file to validate
 * @returns {boolean} - True if valid PDF
 * @throws {Error} - If file is not a valid PDF
 */
export function validatePDFMagicBytes(filePath) {
  const buffer = Buffer.alloc(5);
  let fd;

  try {
    fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 5, 0);
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
    }
  }

  if (!buffer.equals(PDF_MAGIC_BYTES)) {
    throw new Error('Invalid PDF: File does not start with PDF magic bytes (%PDF-)');
  }

  return true;
}

/**
 * Validates file size
 * @param {string} filePath - Path to the file
 * @param {number} maxSize - Maximum size in bytes (default: 50MB)
 * @returns {boolean}
 * @throws {Error} - If file exceeds maximum size
 */
export function validateFileSize(filePath, maxSize = MAX_FILE_SIZE) {
  const stats = fs.statSync(filePath);

  if (stats.size > maxSize) {
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
    throw new Error(`File size (${sizeMB}MB) exceeds maximum allowed (${maxMB}MB)`);
  }

  return true;
}

/**
 * Validates page count
 * @param {number} pageCount - Number of pages in the PDF
 * @param {number} maxPages - Maximum allowed pages (default: 100)
 * @returns {boolean}
 * @throws {Error} - If page count exceeds maximum
 */
export function validatePageCount(pageCount, maxPages = MAX_PAGES) {
  if (typeof pageCount !== 'number' || pageCount < 1) {
    throw new Error('Invalid page count: PDF appears to be empty or corrupted');
  }

  if (pageCount > maxPages) {
    throw new Error(`PDF has ${pageCount} pages, which exceeds the maximum of ${maxPages} pages`);
  }

  return true;
}

/**
 * Wraps a promise with a timeout
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operation - Description of the operation (for error message)
 * @returns {Promise}
 */
export function withTimeout(promise, timeoutMs = PARSING_TIMEOUT_MS, operation = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operation} timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    })
  ]);
}

/**
 * Performs all PDF validations
 * @param {string} filePath - Path to the PDF file
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result with details
 */
export function validatePDF(filePath, options = {}) {
  const {
    maxSize = MAX_FILE_SIZE,
      maxPages = MAX_PAGES,
      checkMagicBytes = true
  } = options;

  const result = {
    valid: false,
    filePath,
    checks: {
      magicBytes: false,
      fileSize: false
    },
    fileSize: 0,
    errors: []
  };

  try {
    // Check file size
    const stats = fs.statSync(filePath);
    result.fileSize = stats.size;

    if (stats.size > maxSize) {
      result.errors.push(`File size (${(stats.size / 1024 / 1024).toFixed(2)}MB) exceeds limit`);
    } else {
      result.checks.fileSize = true;
    }

    // Check magic bytes
    if (checkMagicBytes) {
      try {
        validatePDFMagicBytes(filePath);
        result.checks.magicBytes = true;
      } catch (e) {
        result.errors.push(e.message);
      }
    }

    result.valid = result.errors.length === 0;
  } catch (error) {
    result.errors.push(error.message);
  }

  return result;
}

/**
 * Sanitizes text to prevent prompt injection
 * Removes or escapes potentially dangerous patterns
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
export function sanitizeTextForPrompt(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove common prompt injection patterns
  let sanitized = text
    // Remove attempts to break out of context
    .replace(/```/g, '\'\'\'')
    // Remove system/assistant role markers
    .replace(/\b(system|assistant|user):\s*/gi, '')
    // Remove instruction override attempts
    .replace(/ignore\s+(previous|all)\s+instructions?/gi, '[filtered]')
    .replace(/disregard\s+(previous|all)\s+(instructions?|context)/gi, '[filtered]')
    // Remove attempts to inject new instructions
    .replace(/\[INST\]/gi, '[FILTERED]')
    .replace(/<\|.*?\|>/g, '[FILTERED]');

  return sanitized;
}

export default {
  validatePDFMagicBytes,
  validateFileSize,
  validatePageCount,
  validatePDF,
  withTimeout,
  sanitizeTextForPrompt,
  MAX_FILE_SIZE,
  MAX_PAGES,
  PARSING_TIMEOUT_MS
};