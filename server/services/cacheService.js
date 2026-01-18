/**
 * Cache Service - In-Memory Caching for Processed Documents
 *
 * Provides caching for:
 * - Extracted PDF text (by file hash)
 * - Generated summaries (by file hash)
 * - API responses (for development)
 */

// Cache stores
const textCache = new Map();
const summaryCache = new Map();

// Configuration
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 100;

/**
 * Cache entry with TTL
 * @typedef {Object} CacheEntry
 * @property {*} value - Cached value
 * @property {number} expiresAt - Expiration timestamp
 * @property {number} size - Approximate size in bytes
 */

/**
 * Calculate approximate size of value
 * @param {*} value - Value to measure
 * @returns {number} - Approximate size in bytes
 */
function getApproximateSize(value) {
  if (typeof value === 'string') {
    return value.length * 2; // UTF-16
  }
  if (typeof value === 'object') {
    return JSON.stringify(value).length * 2;
  }
  return 8; // primitive
}

/**
 * Generic cache class
 */
class Cache {
  constructor(name, options = {}) {
    this.name = name;
    this.store = new Map();
    this.ttlMs = options.ttlMs || DEFAULT_TTL_MS;
    this.maxSize = options.maxSize || MAX_CACHE_SIZE;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} - Cached value or undefined
   */
  get(key) {
    const entry = this.store.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [ttlMs] - Optional TTL override
   */
  set(key, value, ttlMs = this.ttlMs) {
    // Evict if at max size
    if (this.store.size >= this.maxSize) {
      this.evictOldest();
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      size: getApproximateSize(value)
    });
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Clear all entries
   */
  clear() {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Evict oldest entry
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.expiresAt < oldestTime) {
        oldestTime = entry.expiresAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    let totalSize = 0;
    for (const entry of this.store.values()) {
      totalSize += entry.size;
    }

    return {
      name: this.name,
      entries: this.store.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ?
        (this.hits / (this.hits + this.misses) * 100).toFixed(1) + '%' :
        '0%',
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
    };
  }
}

// Create cache instances
const pdfTextCache = new Cache('pdfText', {
  ttlMs: 30 * 60 * 1000, // 30 minutes
  maxSize: 50
});

const summariesCache = new Cache('summaries', {
  ttlMs: 60 * 60 * 1000, // 1 hour
  maxSize: 100
});

/**
 * Get cached PDF text by hash
 * @param {string} hash - Document hash
 * @returns {Object|undefined} - Cached PDF data
 */
export function getCachedPDFText(hash) {
  return pdfTextCache.get(hash);
}

/**
 * Cache PDF text by hash
 * @param {string} hash - Document hash
 * @param {Object} pdfData - PDF data to cache
 */
export function cachePDFText(hash, pdfData) {
  pdfTextCache.set(hash, pdfData);
}

/**
 * Get cached summary by hash
 * @param {string} hash - Document hash
 * @returns {Object|undefined} - Cached summary
 */
export function getCachedSummary(hash) {
  return summariesCache.get(hash);
}

/**
 * Cache summary by hash
 * @param {string} hash - Document hash
 * @param {Object} summary - Summary to cache
 */
export function cacheSummary(hash, summary) {
  summariesCache.set(hash, summary);
}

/**
 * Clear all caches
 */
export function clearAllCaches() {
  pdfTextCache.clear();
  summariesCache.clear();
}

/**
 * Get cache statistics
 * @returns {Object} - All cache stats
 */
export function getCacheStats() {
  return {
    pdfText: pdfTextCache.getStats(),
    summaries: summariesCache.getStats()
  };
}

/**
 * Run cache cleanup
 */
export function runCacheCleanup() {
  pdfTextCache.cleanup();
  summariesCache.cleanup();
}

// Run cleanup every 5 minutes
setInterval(runCacheCleanup, 5 * 60 * 1000);

export {
  Cache
};

export default {
  getCachedPDFText,
  cachePDFText,
  getCachedSummary,
  cacheSummary,
  clearAllCaches,
  getCacheStats,
  runCacheCleanup
};