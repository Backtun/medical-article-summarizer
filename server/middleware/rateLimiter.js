/**
 * Rate Limiting Middleware
 *
 * Protects the API from abuse and controls costs by limiting
 * the number of requests per IP address.
 *
 * Usage in index.js:
 *   import { apiLimiter, uploadLimiter } from './middleware/rateLimiter.js';
 *   app.use('/api/', apiLimiter);
 *   app.post('/api/process', uploadLimiter, pdfController.upload.single('pdf'), ...);
 */

/**
 * Simple in-memory rate limiter (no external dependencies)
 * For production, consider using express-rate-limit with Redis store
 */
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute default
    this.max = options.max || 10; // 10 requests default
    this.message = options.message || {
      error: 'Too many requests',
      message: 'Please wait before making another request',
      retryAfter: Math.ceil(this.windowMs / 1000)
    };
    this.requests = new Map();

    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.requests) {
      if (now - data.windowStart > this.windowMs) {
        this.requests.delete(key);
      }
    }
  }

  getKey(req) {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  middleware() {
    return (req, res, next) => {
      const key = this.getKey(req);
      const now = Date.now();

      let data = this.requests.get(key);

      if (!data || now - data.windowStart > this.windowMs) {
        // New window
        data = {
          count: 1,
          windowStart: now
        };
        this.requests.set(key, data);
        this.setHeaders(res, data);
        return next();
      }

      data.count++;

      if (data.count > this.max) {
        this.setHeaders(res, data);
        res.status(429).json(this.message);
        return;
      }

      this.requests.set(key, data);
      this.setHeaders(res, data);
      next();
    };
  }

  setHeaders(res, data) {
    const remaining = Math.max(0, this.max - data.count);
    const resetTime = Math.ceil((data.windowStart + this.windowMs - Date.now()) / 1000);

    res.setHeader('X-RateLimit-Limit', this.max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);
  }
}

// General API rate limiter
const apiLimiterInstance = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: 60
  }
});

// Stricter limiter for PDF uploads (more expensive operation)
const uploadLimiterInstance = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 uploads per minute
  message: {
    error: 'Upload limit reached',
    message: 'Maximum 5 PDF uploads per minute. Please wait before uploading another file.',
    retryAfter: 60
  }
});

export const apiLimiter = apiLimiterInstance.middleware();
export const uploadLimiter = uploadLimiterInstance.middleware();

export default {
  apiLimiter,
  uploadLimiter
};