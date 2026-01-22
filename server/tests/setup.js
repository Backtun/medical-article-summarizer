/**
 * Jest Test Setup
 *
 * Global setup for all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.CHUTES_API_KEY = 'test-key-not-real';
process.env.MODEL = 'test-model';
process.env.MAX_PAGES = '50';
process.env.PARSING_TIMEOUT_MS = '5000';

// Global test timeout
jest.setTimeout(10000);

// Suppress console logs in tests unless debugging
if (process.env.DEBUG !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for debugging
    error: console.error
  };
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});