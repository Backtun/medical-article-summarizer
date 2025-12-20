import assert from 'node:assert/strict';
import { detectStructure, splitIntoPages } from '../services/pdfService.js';

const noopLog = () => {};

function testSplitIntoPagesBasic() {
  const text = 'a\nb\nc\nd\ne\nf';
  const pages = splitIntoPages(text, 3);

  assert.equal(pages.length, 3);
  assert.equal(pages[0].text, 'a\nb');
  assert.equal(pages[1].text, 'c\nd');
  assert.equal(pages[2].text, 'e\nf');
}

function testSplitIntoPagesEmpty() {
  const pages = splitIntoPages('', 2);
  assert.equal(pages.length, 2);
  assert.equal(pages[0].text, '[Página vacía - sin texto extraíble]');
  assert.equal(pages[1].text, '[Página vacía - sin texto extraíble]');
}

function testDetectStructureBasic() {
  const pages = [
    {
      pageNumber: 1,
      text: 'Part I Introduccion\nChapter 1 Metodos'
    }
  ];

  const structure = detectStructure(pages, noopLog);

  assert.equal(structure.parts.length, 1);
  assert.equal(structure.chapters.length, 1);
  assert.equal(structure.parts[0].chapters.length, 1);
  assert.equal(structure.parts[0].chapters[0].title, 'Metodos');
}

function run() {
  testSplitIntoPagesBasic();
  testSplitIntoPagesEmpty();
  testDetectStructureBasic();
  console.log('pdfService tests passed');
}

try {
  run();
} catch (error) {
  console.error('pdfService tests failed');
  console.error(error);
  process.exit(1);
}
