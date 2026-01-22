/**
 * Standalone Mixed Content Tests
 *
 * Tests for the new mixed content detection functionality.
 * Run with: node tests/mixedContent.standalone.test.js
 */

import {
  detectReferencePage,
  analyzePageContent,
  findImportantSections,
  findReferencesSectionStart,
  extractContentBeforeReferences,
  generateMixedContentResponse,
  PAGE_CLASSIFICATION
} from '../utils/referenceDetector.js';

import assert from 'assert';

console.log('='.repeat(60));
console.log('Mixed Content Detection Tests (v2.0)');
console.log('='.repeat(60));
console.log('');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

// ============================================
// Test findImportantSections
// ============================================
console.log('\n--- findImportantSections ---\n');

test('Should find Conclusión section', () => {
  const text = `
Some content here.

Conclusión

El estudio demuestra que los modelos 3D mejoran la planificación.
  `;
  const sections = findImportantSections(text);
  assert(sections.length === 1, `Expected 1 section, got ${sections.length}`);
  assert(sections[0].name === 'Conclusión', `Expected 'Conclusión', got '${sections[0].name}'`);
});

test('Should find multiple Spanish sections', () => {
  const text = `
Complicaciones

Se reportaron complicaciones post-operatorias.

Limitaciones

El estudio tiene varias limitaciones.

Conclusión

En conclusión, el tratamiento es efectivo.
  `;
  const sections = findImportantSections(text);
  assert(sections.length === 3, `Expected 3 sections, got ${sections.length}`);
});

test('Should find English sections', () => {
  const text = `
Discussion

The results indicate improvement.

Limitations

This study has limitations.

Conclusions

We conclude the intervention is effective.
  `;
  const sections = findImportantSections(text);
  assert(sections.length === 3, `Expected 3 sections, got ${sections.length}`);
});

test('Should return empty array for references-only text', () => {
  const text = `
1. Smith J, et al. Journal. 2020;45(3):123. doi:10.1234/example
2. Jones A, et al. Journal. 2019;44(2):456.
  `;
  const sections = findImportantSections(text);
  assert(sections.length === 0, `Expected 0 sections, got ${sections.length}`);
});

// ============================================
// Test findReferencesSectionStart
// ============================================
console.log('\n--- findReferencesSectionStart ---\n');

test('Should find Referencias header', () => {
  const text = `
Conclusión

El estudio aporta evidencia.

Referencias

1. Author A. Journal. 2020.
  `;
  const result = findReferencesSectionStart(text);
  assert(result !== null, 'Should find References section');
  assert(result.headerText === 'Referencias', `Expected 'Referencias', got '${result.headerText}'`);
});

test('Should find English References header', () => {
  const text = `
Conclusion

Important findings.

References

1. Author A. Journal. 2020.
  `;
  const result = findReferencesSectionStart(text);
  assert(result !== null, 'Should find References section');
  assert(result.headerText === 'References', `Expected 'References', got '${result.headerText}'`);
});

test('Should return null when no References section', () => {
  const text = `
Results

The analysis showed significant improvement.
Statistical data: p < 0.001.
  `;
  const result = findReferencesSectionStart(text);
  assert(result === null, 'Should return null');
});

// ============================================
// Test extractContentBeforeReferences
// ============================================
console.log('\n--- extractContentBeforeReferences ---\n');

test('Should extract content before References', () => {
  const text = `Conclusión

El estudio aporta evidencia importante.

Los hallazgos muestran mejoras.

Referencias

1. Author A. Title. Journal. 2020.`;

  const refSection = findReferencesSectionStart(text);
  const extracted = extractContentBeforeReferences(text, refSection);

  assert(extracted.includes('Conclusión'), 'Should contain Conclusión');
  assert(extracted.includes('evidencia importante'), 'Should contain main content');
  assert(!extracted.includes('1. Author A'), 'Should NOT contain references');
});

// ============================================
// Test analyzePageContent - Main Classification
// ============================================
console.log('\n--- analyzePageContent (Tripartite Classification) ---\n');

test('Should classify Conclusion + References as MIXED_CONTENT', () => {
  const text = `
Complicaciones. Hubo una tasa baja de complicaciones con una parestesia
temporal que resolvió a los 50 días postoperatorios.

Limitaciones. A pesar de los resultados prometedores, la muestra es
relativamente pequeña (22 pacientes).

Conclusión

El estudio aporta evidencia sobre los beneficios de utilizar modelos 3D
impresos para la planificación de ATC complejas.

Referencias

1. Learmonth ID, Young C. The operation of the century. Lancet. 2007; 370(9597): 1508-19.
2. Knight SR, Aujla R. Total hip arthroplasty. Orthop Rev. 2011; 3(2): e16.
3. Gallart X, Riba J. Hip prostheses. Rev Esp Cir Ortop Traumatol. 2018; 62(2): 142-52.
  `;

  const result = analyzePageContent(text, 8);

  assert(result.classification === PAGE_CLASSIFICATION.MIXED_CONTENT,
    `Expected MIXED_CONTENT, got ${result.classification}`);
  assert(result.importantSections.length > 0,
    'Should find important sections');
  assert(result.extractableText.includes('Complicaciones'),
    'Extracted text should contain Complicaciones');
  assert(result.extractableText.includes('Conclusión'),
    'Extracted text should contain Conclusión');
  assert(!result.extractableText.includes('Learmonth ID'),
    'Extracted text should NOT contain references');
});

test('Should classify pure references as PURE_REFERENCES', () => {
  const text = `
Referencias

1. Smith J, Jones A, et al. Clinical outcomes. Diabetes Care. 2020;43(5):1123-1130.
   doi:10.1234/dc20-1234

2. Johnson K, Williams M. Risk factors. J Am Coll Cardiol. 2019;74(12):1567-1575.
   doi:10.1234/jacc19-5678

3. Garcia R, Martinez L, et al. Prevalence study. Ann Intern Med. 2021;175(3):345-352.
   doi:10.1234/aim21-9012

4. Lee S, Kim H. Long-term outcomes. Obesity. 2018;26(8):1298-1305.
   doi:10.1234/oby18-3456
  `;

  const result = analyzePageContent(text, 14);

  assert(result.classification === PAGE_CLASSIFICATION.PURE_REFERENCES,
    `Expected PURE_REFERENCES, got ${result.classification}`);
  assert(result.extractableText === '',
    'Extracted text should be empty');
});

test('Should classify normal content as SUBSTANTIVE_CONTENT', () => {
  const text = `
Métodos

Diseño del estudio y participantes
Este fue un estudio de cohorte prospectivo realizado en múltiples centros.
Se incluyeron 7,500 pacientes con diabetes tipo 2.

El desenlace primario fue la incidencia de eventos cardiovasculares mayores,
definido como muerte cardiovascular, infarto de miocardio no fatal,
o accidente cerebrovascular no fatal.

Análisis estadístico
Se utilizó regresión de riesgos proporcionales de Cox para estimar
hazard ratios con intervalos de confianza del 95%.
  `;

  const result = analyzePageContent(text, 5);

  assert(result.classification === PAGE_CLASSIFICATION.SUBSTANTIVE_CONTENT,
    `Expected SUBSTANTIVE_CONTENT, got ${result.classification}`);
  assert(result.extractableText.length > 0,
    'Should have extractable text');
});

test('Should detect substantive content before References (without headers)', () => {
  const text = `
Los resultados demuestran una mejora significativa en los desenlaces clínicos.
El análisis estadístico reveló un hazard ratio de 0.75 (IC 95%: 0.65-0.87, p < 0.001).
Estos hallazgos tienen importantes implicaciones para la práctica clínica.
Se observó una reducción del 25% en eventos cardiovasculares mayores.

Referencias

1. Author A. Study title. Journal. 2020;45:123-130.
2. Author B. Another study. Journal. 2019;44:456-465.
  `;

  const result = analyzePageContent(text, 10);

  assert(result.classification === PAGE_CLASSIFICATION.MIXED_CONTENT,
    `Expected MIXED_CONTENT, got ${result.classification}`);
  assert(result.extractableText.includes('hazard ratio'),
    'Should contain substantive content');
  assert(!result.extractableText.includes('1. Author A'),
    'Should NOT contain references');
});

// ============================================
// Test Real-World Example (Page 8 from image)
// ============================================
console.log('\n--- Real-World Example (Page 8 from image) ---\n');

test('Should correctly process the example page with Conclusion + References', () => {
  // This simulates the actual page from the image
  const text = `
Godoy-Monzón D y cols.

Además, la duración de la cirugía (promedio de 71 minutos) y la minimización
de la pérdida sanguínea (260 ± 90 ml) reflejan un procedimiento quirúrgico eficiente.

Complicaciones. Tal como se mencionó, hubo una tasa baja de complicaciones
con una parestesia temporal que resolvió a los 50 días postoperatorios.
Se comprobó lesión incompleta por electromiografía con sintomatología de
limitación a la flexión, extensión y eversión de pie.

Limitaciones. A pesar de los resultados prometedores, es importante destacar
algunas limitaciones del estudio. En primer lugar, la muestra es relativamente
pequeña (22 pacientes). Además, el seguimiento promedio de 40.7 meses puede
no ser suficiente para evaluar completamente la longevidad del implante.

Se requieren estudios multicéntricos con muestras más grandes y un seguimiento
a largo plazo para validar los hallazgos.

Conclusión

El estudio aporta evidencia sobre los beneficios de utilizar modelos 3D impresos
para la planificación de ATC complejas, siendo mejor a los resultados propuestos
para planificación estándar.

Los hallazgos muestran mejoras significativas en los resultados funcionales y
radiográficos y sugieren una posible reducción de complicaciones.

Referencias

1. Learmonth ID, Young C, Rorabeck C. The operation of the century:
   total hip replacement. Lancet. 2007; 370(9597): 1508-19.

2. Knight SR, Aujla R, Biswas SP. Total hip arthroplasty - over 100 years
   of operative history. Orthop Rev (Pavia). 2011; 3(2): e16.

3. Gallart X, Riba J, Fernández-Valencia JA, Bori G, Munoz-Mahamud E, Combalia A.
   Hip prostheses in young adults: Surface prostheses and short-stem prostheses.
   Rev Esp Cir Ortop Traumatol. 2018; 62(2): 142-52.

4. Pivec R, Johnson AJ, Mears SC, Mont MA. Hip arthroplasty. Lancet.
   2012; 380(9855): 1768-77.
  `;

  const result = analyzePageContent(text, 8);

  // Must be MIXED_CONTENT
  assert(result.classification === PAGE_CLASSIFICATION.MIXED_CONTENT,
    `Expected MIXED_CONTENT, got ${result.classification}`);

  // Must find important sections
  assert(result.importantSections.length > 0,
    `Should find important sections, found ${result.importantSections.length}`);

  // Check that Conclusión was detected
  const sectionNames = result.importantSections.map(s => s.name);
  const hasConclusion = sectionNames.some(n => n.includes('Conclusión'));
  assert(hasConclusion, 'Should detect Conclusión section');

  // Extracted content must have the important medical content
  assert(result.extractableText.includes('Complicaciones'),
    'Should include Complicaciones');
  assert(result.extractableText.includes('Limitaciones'),
    'Should include Limitaciones');
  assert(result.extractableText.includes('22 pacientes'),
    'Should include study details (22 pacientes)');
  assert(result.extractableText.includes('evidencia'),
    'Should include conclusion content');

  // Extracted content must NOT have references
  assert(!result.extractableText.includes('Learmonth ID'),
    'Should NOT include reference author Learmonth ID');
  assert(!result.extractableText.includes('Knight SR'),
    'Should NOT include reference author Knight SR');
  assert(!result.extractableText.includes('Lancet. 2007'),
    'Should NOT include reference citation details');

  console.log(`  → Extracted ${result.extractableText.length} characters of content`);
  console.log(`  → Found ${result.importantSections.length} important sections`);
});

// ============================================
// Test generateMixedContentResponse
// ============================================
console.log('\n--- generateMixedContentResponse ---\n');

test('Should generate descriptive message for mixed content', () => {
  const analysis = {
    classification: PAGE_CLASSIFICATION.MIXED_CONTENT,
    pageNumber: 8,
    importantSections: [
      { name: 'Conclusión', lineIndex: 10, position: 500 },
      { name: 'Limitaciones', lineIndex: 5, position: 200 }
    ],
    extractableText: 'Some important content extracted',
    confidence: 0.9
  };

  const response = generateMixedContentResponse(8, analysis);

  assert(response.includes('Página 8'), 'Should include page number');
  assert(response.includes('mixto'), 'Should mention mixed content');
  assert(response.includes('Conclusión'), 'Should mention found sections');
});

// ============================================
// Summary
// ============================================
console.log('\n' + '='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\n⚠ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
