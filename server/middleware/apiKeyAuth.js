/**
 * API Key Authentication Middleware
 *
 * Provides API key-based authentication for public API access.
 * Supports multiple tiers with different rate limits.
 */

import {
  randomUUID
} from 'crypto';
import crypto from 'crypto';

// API key tiers
const TIERS = {
  free: {
    name: 'Free',
    rateLimit: 10, // requests per minute
    maxPages: 20,
    maxFileSize: 10 * 1024 * 1024 // 10MB
  },
  basic: {
    name: 'Basic',
    rateLimit: 50,
    maxPages: 50,
    maxFileSize: 25 * 1024 * 1024 // 25MB
  },
  pro: {
    name: 'Pro',
    rateLimit: 200,
    maxPages: 100,
    maxFileSize: 50 * 1024 * 1024 // 50MB
  },
  enterprise: {
    name: 'Enterprise',
    rateLimit: 1000,
    maxPages: 500,
    maxFileSize: 100 * 1024 * 1024 // 100MB
  }
};

// In-memory API key store (replace with database in production)
const apiKeys = new Map();

// Usage tracking
const usageTracker = new Map();

/**
 * Generate a new API key
 * @param {string} tier - Tier name
 * @param {Object} metadata - Additional metadata
 * @returns {Object} - { key, keyHash, tier, metadata }
 */
export function generateApiKey(tier = 'free', metadata = {}) {
  const key = `msum_${tier}_${randomUUID().replace(/-/g, '')}`;
  const keyHash = hashApiKey(key);

  const keyData = {
    keyHash,
    tier,
    createdAt: new Date().toISOString(),
    lastUsed: null,
    metadata,
    active: true
  };

  apiKeys.set(keyHash, keyData);

  return {
    key, // Only returned once, not stored
    keyHash,
    tier,
    limits: TIERS[tier]
  };
}

/**
 * Hash API key for secure storage
 * @param {string} key - Raw API key
 * @returns {string} - Hashed key
 */
function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validate API key
 * @param {string} key - Raw API key
 * @returns {Object|null} - Key data or null if invalid
 */
export function validateApiKey(key) {
  if (!key) return null;

  const keyHash = hashApiKey(key);
  const keyData = apiKeys.get(keyHash);

  if (!keyData || !keyData.active) {
    return null;
  }

  // Update last used
  keyData.lastUsed = new Date().toISOString();
  apiKeys.set(keyHash, keyData);

  return {
    ...keyData,
    limits: TIERS[keyData.tier]
  };
}

/**
 * Revoke API key
 * @param {string} keyHash - Hashed API key
 * @returns {boolean} - Success
 */
export function revokeApiKey(keyHash) {
  const keyData = apiKeys.get(keyHash);
  if (!keyData) return false;

  keyData.active = false;
  apiKeys.set(keyHash, keyData);
  return true;
}

/**
 * Check rate limit for API key
 * @param {string} keyHash - Hashed API key
 * @param {string} tier - Key tier
 * @returns {Object} - { allowed, remaining, resetAt }
 */
export function checkRateLimit(keyHash, tier) {
  const limits = TIERS[tier] || TIERS.free;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  let usage = usageTracker.get(keyHash);

  if (!usage || now - usage.windowStart > windowMs) {
    usage = {
      count: 0,
      windowStart: now
    };
  }

  usage.count++;
  usageTracker.set(keyHash, usage);

  const remaining = Math.max(0, limits.rateLimit - usage.count);
  const resetAt = new Date(usage.windowStart + windowMs).toISOString();

  return {
    allowed: usage.count <= limits.rateLimit,
    remaining,
    resetAt,
    limit: limits.rateLimit
  };
}

/**
 * Express middleware for API key authentication
 * @param {Object} options - Middleware options
 * @returns {Function} - Express middleware
 */
export function apiKeyAuth(options = {}) {
  const {
    required = false, headerName = 'X-API-Key'
  } = options;

  return (req, res, next) => {
    const apiKey = req.headers[headerName.toLowerCase()] || req.query.api_key;

    if (!apiKey) {
      if (required) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'API key required. Provide via X-API-Key header or api_key query parameter.'
        });
      }
      // No key, use default limits
      req.apiTier = 'free';
      req.apiLimits = TIERS.free;
      return next();
    }

    const keyData = validateApiKey(apiKey);

    if (!keyData) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or revoked API key.'
      });
    }

    // Check rate limit
    const rateCheck = checkRateLimit(keyData.keyHash, keyData.tier);

    res.setHeader('X-RateLimit-Limit', rateCheck.limit);
    res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);
    res.setHeader('X-RateLimit-Reset', rateCheck.resetAt);

    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Resets at ${rateCheck.resetAt}`,
        retryAfter: Math.ceil((new Date(rateCheck.resetAt) - Date.now()) / 1000)
      });
    }

    // Attach key info to request
    req.apiKey = keyData;
    req.apiTier = keyData.tier;
    req.apiLimits = keyData.limits;

    next();
  };
}

/**
 * Get tier information
 * @returns {Object} - All tiers info
 */
export function getTiers() {
  return {
    ...TIERS
  };
}

export default {
  generateApiKey,
  validateApiKey,
  revokeApiKey,
  checkRateLimit,
  apiKeyAuth,
  getTiers,
  TIERS
};