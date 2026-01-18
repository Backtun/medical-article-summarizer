/** @type {import('jest').Config} */
const config = {
  // Use ES modules
  transform: {},

  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'services/**/*.js',
    'utils/**/*.js',
    'controllers/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'mjs', 'json'],

  // Verbose output
  verbose: true,

  // Timeout for tests
  testTimeout: 10000,

  // Setup files
  setupFilesAfterEnv: ['./tests/setup.js'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ]
};

export default config;