/**
 * Structured Logger - Winston-based Logging
 *
 * Provides structured logging with:
 * - JSON format for production
 * - Colorized output for development
 * - Correlation IDs for request tracing
 * - Sensitive data filtering
 */

import {
  randomUUID
} from 'crypto';

// Log levels
const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Colors for console output
const COLORS = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m', // yellow
  info: '\x1b[36m', // cyan
  http: '\x1b[35m', // magenta
  debug: '\x1b[37m', // white
  reset: '\x1b[0m'
};

// Sensitive fields to redact
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'secret'
];

/**
 * Redact sensitive data from objects
 * @param {Object} obj - Object to redact
 * @returns {Object} - Redacted object
 */
function redactSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const redacted = Array.isArray(obj) ? [...obj] : {
    ...obj
  };

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }

  return redacted;
}

/**
 * Format log entry
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @param {string} correlationId - Request correlation ID
 * @returns {Object} - Formatted log entry
 */
function formatLogEntry(level, message, meta = {}, correlationId = null) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    correlationId,
    ...redactSensitive(meta)
  };
}

/**
 * Logger class
 */
class Logger {
  constructor(options = {}) {
    this.level = options.level || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
    this.isProduction = process.env.NODE_ENV === 'production';
    this.correlationId = null;
  }

  /**
   * Set correlation ID for request tracing
   * @param {string} id - Correlation ID
   */
  setCorrelationId(id) {
    this.correlationId = id;
  }

  /**
   * Generate new correlation ID
   * @returns {string} - New correlation ID
   */
  generateCorrelationId() {
    this.correlationId = randomUUID().split('-')[0];
    return this.correlationId;
  }

  /**
   * Clear correlation ID
   */
  clearCorrelationId() {
    this.correlationId = null;
  }

  /**
   * Check if level should be logged
   * @param {string} level - Log level to check
   * @returns {boolean}
   */
  shouldLog(level) {
    return LEVELS[level] <= LEVELS[this.level];
  }

  /**
   * Output log entry
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const entry = formatLogEntry(level, message, meta, this.correlationId);

    if (this.isProduction) {
      // JSON format for production (easy to parse by log aggregators)
      console.log(JSON.stringify(entry));
    } else {
      // Colorized format for development
      const color = COLORS[level] || COLORS.reset;
      const timestamp = entry.timestamp.split('T')[1].split('.')[0];
      const corrId = entry.correlationId ? `[${entry.correlationId}] ` : '';
      const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      console.log(`${color}[${timestamp}] ${level.toUpperCase().padEnd(5)} ${corrId}${message}${metaStr}${COLORS.reset}`);
    }
  }

  // Convenience methods
  error(message, meta = {}) {
    this.log('error', message, meta);
  }
  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }
  info(message, meta = {}) {
    this.log('info', message, meta);
  }
  http(message, meta = {}) {
    this.log('http', message, meta);
  }
  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }
}

// Singleton instance
const logger = new Logger();

/**
 * Express middleware for request logging
 */
export function requestLogger(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || logger.generateCorrelationId();

  // Add correlation ID to request and response
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  const start = Date.now();

  // Log request
  logger.http(`${req.method} ${req.path}`, {
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.path} ${res.statusCode}`, {
      duration: `${duration}ms`,
      contentLength: res.get('content-length')
    });
    logger.clearCorrelationId();
  });

  next();
}

export {
  logger,
  Logger
};
export default logger;