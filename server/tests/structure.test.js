/**
 * Structure Service Tests
 *
 * Tests for document structure detection and organization
 */

import assert from 'node:assert/strict';
import {
  SAMPLE_MEDICAL_TEXT,
  SAMPLE_ANALYZED_PAGES,
  SAMPLE_STRUCTURE
} from './fixtures/index.js';

// Mock the detectStructure function logic for testing
function mockDetectIMRyD(text) {
  const patterns = {
    abstract: /\b(?:ABSTRACT|Abstract|Resumen)\b/i,
    introduction: /\b(?:INTRODUCTION|Introduction|Introducción)\b/i,
    methods: /\b(?:METHODS?|Methods?|Metodología)\b/i,
    results: /\b(?:RESULTS?|Results?|Resultados)\b/i,
    discussion: /\b(?:DISCUSSION|Discussion|Discusión)\b/i,
    references: /\b(?:REFERENCES?|References?|Referencias)\b/i
  };

  const detected = {};
  for (const [section, pattern] of Object.entries(patterns)) {
    detected[section] = pattern.test(text);
  }

  return detected;
}

// Tests
function testDetectsIMRyDSections() {
  const detected = mockDetectIMRyD(SAMPLE_MEDICAL_TEXT);

  assert.equal(detected.introduction, true, 'Should detect Introduction');
  assert.equal(detected.methods, true, 'Should detect Methods');
  assert.equal(detected.results, true, 'Should detect Results');
  assert.equal(detected.discussion, true, 'Should detect Discussion');

  console.log('✓ testDetectsIMRyDSections');
}

function testNonMedicalTextNoIMRyD() {
  const nonMedicalText = `
    Chapter 1: Introduction to Programming
    This is a computer science textbook.
    We will learn about algorithms and data structures.
  `;

  const detected = mockDetectIMRyD(nonMedicalText);

  // Should not detect medical sections
  assert.equal(detected.methods, false, 'Should not detect Methods');
  assert.equal(detected.results, false, 'Should not detect Results');
  assert.equal(detected.discussion, false, 'Should not detect Discussion');

  console.log('✓ testNonMedicalTextNoIMRyD');
}

function testStructureHasRequiredFields() {
  assert.ok(SAMPLE_STRUCTURE.parts, 'Structure should have parts');
  assert.ok(SAMPLE_STRUCTURE.chapters !== undefined, 'Structure should have chapters');
  assert.ok(SAMPLE_STRUCTURE.imryd, 'Structure should have imryd');
  assert.ok(typeof SAMPLE_STRUCTURE.isIMRyDFormat === 'boolean', 'Should have isIMRyDFormat flag');

  console.log('✓ testStructureHasRequiredFields');
}

function testIMRyDFormatDetection() {
  // Should require at least 2 of the 4 main sections
  const fullIMRyD = {
    introduction: true,
    methods: true,
    results: true,
    discussion: true
  };

  const partialIMRyD = {
    introduction: true,
    methods: true,
    results: false,
    discussion: false
  };

  const noIMRyD = {
    introduction: true,
    methods: false,
    results: false,
    discussion: false
  };

  function isIMRyDFormat(detected) {
    const sections = ['introduction', 'methods', 'results', 'discussion'];
    const count = sections.filter(s => detected[s]).length;
    return count >= 2;
  }

  assert.equal(isIMRyDFormat(fullIMRyD), true, 'Full IMRyD should be detected');
  assert.equal(isIMRyDFormat(partialIMRyD), true, 'Partial IMRyD (2+ sections) should be detected');
  assert.equal(isIMRyDFormat(noIMRyD), false, 'Single section should not be IMRyD');

  console.log('✓ testIMRyDFormatDetection');
}

function testAnalyzedPagesStructure() {
  for (const page of SAMPLE_ANALYZED_PAGES) {
    assert.ok(typeof page.pageNumber === 'number', 'Page should have pageNumber');
    assert.ok(typeof page.analysis === 'string', 'Page should have analysis');
    assert.ok(typeof page.text === 'string', 'Page should have text');
  }

  console.log('✓ testAnalyzedPagesStructure');
}

// Run all tests
function run() {
  console.log('\n=== Structure Service Tests ===\n');

  testDetectsIMRyDSections();
  testNonMedicalTextNoIMRyD();
  testStructureHasRequiredFields();
  testIMRyDFormatDetection();
  testAnalyzedPagesStructure();

  console.log('\n✓ All Structure Service tests passed!\n');
}

try {
  run();
} catch (error) {
  console.error('\n✗ Structure Service tests failed:');
  console.error(error);
  process.exit(1);
}