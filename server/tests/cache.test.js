/**
 * Cache Service Tests
 *
 * Tests for caching functionality
 */

import assert from 'node:assert/strict';
import {
  Cache,
  getCachedPDFText,
  cachePDFText,
  getCachedSummary,
  cacheSummary,
  clearAllCaches,
  getCacheStats
} from '../services/cacheService.js';

// Tests
function testCacheSetAndGet() {
  const cache = new Cache('test', {
    ttlMs: 5000,
    maxSize: 10
  });

  cache.set('key1', 'value1');
  const result = cache.get('key1');

  assert.equal(result, 'value1', 'Should retrieve cached value');

  console.log('✓ testCacheSetAndGet');
}

function testCacheMiss() {
  const cache = new Cache('test', {
    ttlMs: 5000,
    maxSize: 10
  });

  const result = cache.get('nonexistent');

  assert.equal(result, undefined, 'Should return undefined for missing key');

  console.log('✓ testCacheMiss');
}

function testCacheHas() {
  const cache = new Cache('test', {
    ttlMs: 5000,
    maxSize: 10
  });

  cache.set('key1', 'value1');

  assert.equal(cache.has('key1'), true, 'Should return true for existing key');
  assert.equal(cache.has('nonexistent'), false, 'Should return false for missing key');

  console.log('✓ testCacheHas');
}

function testCacheDelete() {
  const cache = new Cache('test', {
    ttlMs: 5000,
    maxSize: 10
  });

  cache.set('key1', 'value1');
  cache.delete('key1');

  assert.equal(cache.get('key1'), undefined, 'Should return undefined after delete');

  console.log('✓ testCacheDelete');
}

function testCacheClear() {
  const cache = new Cache('test', {
    ttlMs: 5000,
    maxSize: 10
  });

  cache.set('key1', 'value1');
  cache.set('key2', 'value2');
  cache.clear();

  assert.equal(cache.get('key1'), undefined, 'Should clear all entries');
  assert.equal(cache.get('key2'), undefined, 'Should clear all entries');

  console.log('✓ testCacheClear');
}

async function testCacheExpiration() {
  const cache = new Cache('test', {
    ttlMs: 50,
    maxSize: 10
  }); // 50ms TTL

  cache.set('key1', 'value1');

  // Should exist immediately
  assert.equal(cache.get('key1'), 'value1', 'Should exist immediately');

  // Wait for expiration
  await new Promise(resolve => setTimeout(resolve, 100));

  // Should be expired
  assert.equal(cache.get('key1'), undefined, 'Should be expired after TTL');

  console.log('✓ testCacheExpiration');
}

function testCacheEviction() {
  const cache = new Cache('test', {
    ttlMs: 5000,
    maxSize: 3
  });

  cache.set('key1', 'value1');
  cache.set('key2', 'value2');
  cache.set('key3', 'value3');
  cache.set('key4', 'value4'); // Should trigger eviction

  const stats = cache.getStats();
  assert.ok(stats.entries <= 3, 'Should not exceed max size');

  console.log('✓ testCacheEviction');
}

function testCacheStats() {
  const cache = new Cache('test', {
    ttlMs: 5000,
    maxSize: 10
  });

  cache.set('key1', 'value1');
  cache.get('key1'); // hit
  cache.get('nonexistent'); // miss

  const stats = cache.getStats();

  assert.equal(stats.name, 'test', 'Should have name');
  assert.equal(stats.entries, 1, 'Should have 1 entry');
  assert.equal(stats.hits, 1, 'Should have 1 hit');
  assert.equal(stats.misses, 1, 'Should have 1 miss');
  assert.equal(stats.hitRate, '50.0%', 'Should have 50% hit rate');

  console.log('✓ testCacheStats');
}

function testPDFTextCache() {
  clearAllCaches();

  const hash = 'abc123';
  const pdfData = {
    text: 'Sample text',
    numpages: 5
  };

  cachePDFText(hash, pdfData);
  const result = getCachedPDFText(hash);

  assert.deepEqual(result, pdfData, 'Should cache and retrieve PDF text');

  console.log('✓ testPDFTextCache');
}

function testSummaryCache() {
  clearAllCaches();

  const hash = 'def456';
  const summary = {
    title: 'Test',
    content: 'Summary content'
  };

  cacheSummary(hash, summary);
  const result = getCachedSummary(hash);

  assert.deepEqual(result, summary, 'Should cache and retrieve summary');

  console.log('✓ testSummaryCache');
}

function testGlobalCacheStats() {
  clearAllCaches();

  cachePDFText('hash1', {
    text: 'test'
  });
  cacheSummary('hash2', {
    title: 'test'
  });

  const stats = getCacheStats();

  assert.ok(stats.pdfText, 'Should have pdfText stats');
  assert.ok(stats.summaries, 'Should have summaries stats');
  assert.equal(stats.pdfText.entries, 1, 'Should have 1 PDF entry');
  assert.equal(stats.summaries.entries, 1, 'Should have 1 summary entry');

  console.log('✓ testGlobalCacheStats');
}

// Run all tests
async function run() {
  console.log('\n=== Cache Service Tests ===\n');

  testCacheSetAndGet();
  testCacheMiss();
  testCacheHas();
  testCacheDelete();
  testCacheClear();
  await testCacheExpiration();
  testCacheEviction();
  testCacheStats();
  testPDFTextCache();
  testSummaryCache();
  testGlobalCacheStats();

  console.log('\n✓ All Cache Service tests passed!\n');
}

run().catch((error) => {
  console.error('\n✗ Cache Service tests failed:');
  console.error(error);
  process.exit(1);
});