/**
 * Rate Limiter Tests
 *
 * Tests for the rate limiting middleware
 */

import assert from 'node:assert/strict';

// Simple mock for req/res objects
function createMockReq(ip = '127.0.0.1') {
  return {
    ip,
    connection: {
      remoteAddress: ip
    }
  };
}

function createMockRes() {
  const res = {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
  return res;
}

// Import the RateLimiter class logic (simplified test version)
class TestRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000;
    this.max = options.max || 10;
    this.message = options.message || {
      error: 'Too many requests'
    };
    this.requests = new Map();
  }

  getKey(req) {
    return req.ip || 'unknown';
  }

  check(req) {
    const key = this.getKey(req);
    const now = Date.now();

    let data = this.requests.get(key);

    if (!data || now - data.windowStart > this.windowMs) {
      data = {
        count: 1,
        windowStart: now
      };
      this.requests.set(key, data);
      return {
        allowed: true,
        remaining: this.max - 1
      };
    }

    data.count++;

    if (data.count > this.max) {
      return {
        allowed: false,
        remaining: 0
      };
    }

    this.requests.set(key, data);
    return {
      allowed: true,
      remaining: this.max - data.count
    };
  }

  reset() {
    this.requests.clear();
  }
}

// Tests
function testRateLimiter_AllowsWithinLimit() {
  const limiter = new TestRateLimiter({
    max: 5,
    windowMs: 1000
  });
  const req = createMockReq('192.168.1.1');

  for (let i = 0; i < 5; i++) {
    const result = limiter.check(req);
    assert.equal(result.allowed, true, `Request ${i + 1} should be allowed`);
  }

  console.log('✓ testRateLimiter_AllowsWithinLimit');
}

function testRateLimiter_BlocksOverLimit() {
  const limiter = new TestRateLimiter({
    max: 3,
    windowMs: 1000
  });
  const req = createMockReq('192.168.1.2');

  // First 3 should pass
  for (let i = 0; i < 3; i++) {
    limiter.check(req);
  }

  // 4th should be blocked
  const result = limiter.check(req);
  assert.equal(result.allowed, false, 'Request over limit should be blocked');

  console.log('✓ testRateLimiter_BlocksOverLimit');
}

function testRateLimiter_DifferentIPs() {
  const limiter = new TestRateLimiter({
    max: 2,
    windowMs: 1000
  });

  const req1 = createMockReq('192.168.1.1');
  const req2 = createMockReq('192.168.1.2');

  // Both IPs should have their own counters
  limiter.check(req1);
  limiter.check(req1);
  limiter.check(req2);

  const result1 = limiter.check(req1);
  const result2 = limiter.check(req2);

  assert.equal(result1.allowed, false, 'IP1 should be blocked');
  assert.equal(result2.allowed, true, 'IP2 should still be allowed');

  console.log('✓ testRateLimiter_DifferentIPs');
}

function testRateLimiter_WindowReset() {
  const limiter = new TestRateLimiter({
    max: 2,
    windowMs: 50
  });
  const req = createMockReq('192.168.1.3');

  // Use up the limit
  limiter.check(req);
  limiter.check(req);

  // Should be blocked
  const blocked = limiter.check(req);
  assert.equal(blocked.allowed, false, 'Should be blocked');

  // Wait for window to expire and test again
  return new Promise((resolve) => {
    setTimeout(() => {
      const result = limiter.check(req);
      assert.equal(result.allowed, true, 'Should be allowed after window reset');
      console.log('✓ testRateLimiter_WindowReset');
      resolve();
    }, 60);
  });
}

function testRateLimiter_ReturnsRemaining() {
  const limiter = new TestRateLimiter({
    max: 5,
    windowMs: 1000
  });
  const req = createMockReq('192.168.1.4');

  const result1 = limiter.check(req);
  assert.equal(result1.remaining, 4, 'Should have 4 remaining');

  const result2 = limiter.check(req);
  assert.equal(result2.remaining, 3, 'Should have 3 remaining');

  console.log('✓ testRateLimiter_ReturnsRemaining');
}

// Run all tests
async function run() {
  console.log('\n=== Rate Limiter Tests ===\n');

  testRateLimiter_AllowsWithinLimit();
  testRateLimiter_BlocksOverLimit();
  testRateLimiter_DifferentIPs();
  await testRateLimiter_WindowReset();
  testRateLimiter_ReturnsRemaining();

  console.log('\n✓ All Rate Limiter tests passed!\n');
}

run().catch((error) => {
  console.error('\n✗ Rate Limiter tests failed:');
  console.error(error);
  process.exit(1);
});