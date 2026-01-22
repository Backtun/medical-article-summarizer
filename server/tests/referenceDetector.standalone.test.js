/**
 * Reference Detector Standalone Tests
 *
 * Run with: node server/tests/referenceDetector.standalone.test.js
 *
 * Tests for the reference page detection module that prevents AI hallucination
 * when processing bibliography pages.
 */

import {
  detectReferencePage,
  generateReferencePageResponse,
  hasSubstantiveContent
} from '../utils/referenceDetector.js';

console.log('='.repeat(60));
console.log('Reference Detector Tests');
console.log('='.repeat(60));
console.log('');

const tests = [];

// ============================================
// detectReferencePage tests
// ============================================

tests.push({
  name: 'Detect page with "References" header and DOIs',
  fn: () => {
    const text = `
References

1. Saeedi P, Petersohn I, Salpea P, et al. Global and regional diabetes prevalence estimates
   for 2019 and projections for 2030 and 2045. doi:10.1016/j.diabres.2019.107843

2. Zheng Y, Ley SH, Hu FB. Global aetiology and epidemiology of type 2 diabetes mellitus
   and its complications. doi:10.1038/nrendo.2017.151

3. American Diabetes Association. Standards of Medical Care in Diabetes—2021.
   doi:10.2337/dc21-S002
    `;
    const result = detectReferencePage(text, 14);
    if (!result.isReferencePage) throw new Error('Should detect as reference page');
    if (result.confidence < 0.5) throw new Error('Confidence should be >= 0.5');
    if (result.stats.doiCount !== 3) throw new Error(`Expected 3 DOIs, got ${result.stats.doiCount}`);
    return true;
  }
});

tests.push({
  name: 'Detect page with numbered entries and journal citations',
  fn: () => {
    const text = `
1. Smith J, Jones A, Brown B. Clinical outcomes in diabetic patients.
   Diabetes Care. 2020;43(5):1123-1130.

2. Johnson K, Williams M. Risk factors for cardiovascular disease.
   J Am Coll Cardiol. 2019;74(12):1567-1575.

3. Garcia R, Martinez L, et al. Prevalence of metabolic syndrome.
   Ann Intern Med. 2021;175(3):345-352.

4. Lee S, Kim H, Park J. Long-term outcomes of bariatric surgery.
   Obesity. 2018;26(8):1298-1305.
    `;
    const result = detectReferencePage(text, 15);
    if (!result.isReferencePage) throw new Error('Should detect as reference page');
    if (result.stats.journalCitations < 3) throw new Error(`Expected >= 3 journal citations`);
    return true;
  }
});

tests.push({
  name: 'Detect page with PMID patterns',
  fn: () => {
    const text = `
References

1. Author A, Author B. Title of study. Journal. 2020. PMID: 32456789
2. Author C, Author D. Another study. Journal. 2019. PMID: 31234567
3. Author E, et al. Third study. Journal. 2021. PMID: 33789012
    `;
    const result = detectReferencePage(text, 16);
    if (!result.isReferencePage) throw new Error('Should detect as reference page');
    if (result.stats.pmidCount !== 3) throw new Error(`Expected 3 PMIDs, got ${result.stats.pmidCount}`);
    return true;
  }
});

tests.push({
  name: 'NOT detect page with actual medical content (Methods section)',
  fn: () => {
    const text = `
Methods

Study Design and Participants
This was a prospective cohort study conducted at multiple centers across Spain.
We enrolled 7,500 patients with type 2 diabetes mellitus who met the inclusion criteria.

The primary outcome was the incidence of major adverse cardiovascular events (MACE),
defined as a composite of cardiovascular death, non-fatal myocardial infarction,
or non-fatal stroke.

Statistical Analysis
We used Cox proportional hazards regression to estimate hazard ratios (HR) with
95% confidence intervals (CI). All analyses were performed using SPSS version 25.
    `;
    const result = detectReferencePage(text, 5);
    if (result.isReferencePage) throw new Error('Should NOT detect as reference page');
    if (result.confidence >= 0.5) throw new Error('Confidence should be < 0.5');
    return true;
  }
});

tests.push({
  name: 'NOT detect page with results and statistics',
  fn: () => {
    const text = `
Results

Patient Characteristics
A total of 7,683 participants were included in the final analysis.
The mean age was 65.3 years (SD 8.2), and 52.1% were male.

Primary Outcome
During a median follow-up of 8.7 years, 1,234 patients experienced MACE
(cumulative incidence 16.1%). The hazard ratio for patients with HbA1c > 7%
compared to those with HbA1c ≤ 7% was 1.45 (95% CI: 1.28-1.64, p < 0.001).

Table 1 shows the baseline characteristics of the study population.
    `;
    const result = detectReferencePage(text, 8);
    if (result.isReferencePage) throw new Error('Should NOT detect results as reference page');
    return true;
  }
});

tests.push({
  name: 'Handle empty or null input',
  fn: () => {
    if (detectReferencePage('', 1).isReferencePage) throw new Error('Empty string should not be reference');
    if (detectReferencePage(null, 1).isReferencePage) throw new Error('Null should not be reference');
    if (detectReferencePage(undefined, 1).isReferencePage) throw new Error('Undefined should not be reference');
    return true;
  }
});

tests.push({
  name: 'Detect Spanish references section',
  fn: () => {
    const text = `
Referencias

1. García P, López M, Martínez R, et al. Prevalencia de diabetes en población adulta.
   Rev Med Chile. 2020;148(3):345-352. doi:10.4067/S0034-98872020000300345

2. Rodríguez A, Fernández B. Factores de riesgo cardiovascular.
   Med Clin (Barc). 2019;153(7):278-284. doi:10.1016/j.medcli.2019.01.023
    `;
    const result = detectReferencePage(text, 14);
    if (!result.isReferencePage) throw new Error('Should detect Spanish references');
    return true;
  }
});

// ============================================
// generateReferencePageResponse tests
// ============================================

tests.push({
  name: 'Generate appropriate response message',
  fn: () => {
    const detection = {
      isReferencePage: true,
      confidence: 0.85,
      reasons: ['Contains "References" or similar header', 'Contains 5 DOI patterns'],
      pageNumber: 14,
      stats: { doiCount: 5, pmidCount: 0 }
    };
    const response = generateReferencePageResponse(14, detection);
    if (!response.includes('página (14)')) throw new Error('Should include page number');
    if (!response.includes('referencias bibliográficas')) throw new Error('Should mention references');
    if (!response.includes('85%')) throw new Error('Should include confidence percentage');
    return true;
  }
});

tests.push({
  name: 'Handle empty reasons array',
  fn: () => {
    const detection = {
      isReferencePage: true,
      confidence: 0.6,
      reasons: [],
      pageNumber: 15,
      stats: {}
    };
    const response = generateReferencePageResponse(15, detection);
    if (!response.includes('página (15)')) throw new Error('Should include page number');
    if (response.includes('()')) throw new Error('Should not have empty parentheses');
    return true;
  }
});

// ============================================
// hasSubstantiveContent tests
// ============================================

tests.push({
  name: 'Detect substantive medical methodology content',
  fn: () => {
    const text = `
This prospective cohort study enrolled 5,000 patients with type 2 diabetes.
The primary outcome was cardiovascular mortality. Statistical analysis was
performed using Cox regression. Results showed a significant reduction in
mortality rates (HR 0.75, 95% CI 0.65-0.87, p < 0.001).
    `;
    const result = hasSubstantiveContent(text);
    if (!result.hasContent) throw new Error('Should detect substantive content');
    return true;
  }
});

tests.push({
  name: 'Return false for reference-only page',
  fn: () => {
    const text = `
References

1. Smith J, et al. Journal. 2020;45(3):123. doi:10.1234/example
2. Jones A, et al. Journal. 2019;44(2):456. doi:10.1234/example2
3. Brown B, et al. Journal. 2021;46(1):789. doi:10.1234/example3
    `;
    const result = hasSubstantiveContent(text);
    if (result.hasContent) throw new Error('Should NOT detect reference page as substantive');
    if (!result.reason.toLowerCase().includes('reference')) throw new Error('Reason should mention references');
    return true;
  }
});

tests.push({
  name: 'Return false for very short text',
  fn: () => {
    const result = hasSubstantiveContent('Page 14');
    if (result.hasContent) throw new Error('Short text should not be substantive');
    if (!result.reason.includes('short')) throw new Error('Reason should mention length');
    return true;
  }
});

tests.push({
  name: 'Return false for empty input',
  fn: () => {
    if (hasSubstantiveContent('').hasContent) throw new Error('Empty string should not be substantive');
    if (hasSubstantiveContent(null).hasContent) throw new Error('Null should not be substantive');
    return true;
  }
});

tests.push({
  name: 'Detect Spanish medical content',
  fn: () => {
    const text = `
El estudio incluyó 3,500 pacientes con diabetes tipo 2. Los resultados
mostraron una reducción significativa en los eventos cardiovasculares.
El método utilizado fue un ensayo clínico aleatorizado. Las conclusiones
indican que el tratamiento es efectivo para prevenir complicaciones.
    `;
    const result = hasSubstantiveContent(text);
    if (!result.hasContent) throw new Error('Should detect Spanish medical content');
    return true;
  }
});

// ============================================
// Real-world examples
// ============================================

tests.push({
  name: 'Detect typical PLoS ONE reference format',
  fn: () => {
    const text = `
PLOS ONE | https://doi.org/10.1371/journal.pone.0276761 October 25, 2022 14 / 16

References
1. Saeedi P, Petersohn I, Salpea P, Malanda B, Karuranga S, Unwin N, et al. Global and regional diabetes
   prevalence estimates for 2019 and projections for 2030 and 2045: Results from the International Diabetes
   Federation Diabetes Atlas, 9th edition. Diabetes Res Clin Pract. 2019; 157:107843. https://doi.org/10.1016/j.
   diabres.2019.107843 PMID: 31518657

2. Zheng Y, Ley SH, Hu FB. Global aetiology and epidemiology of type 2 diabetes mellitus and its complica-
   tions. Nat Rev Endocrinol. 2018; 14(2):88–98. https://doi.org/10.1038/nrendo.2017.151 PMID: 29219149

3. Emerging Risk Factors Collaboration. Diabetes mellitus, fasting blood glucose concentration, and risk of
   vascular disease: a collaborative meta-analysis of 102 prospective studies. Lancet. 2010; 375
   (9733):2215–22. https://doi.org/10.1016/S0140-6736(10)60484-9 PMID: 20609967
    `;
    const result = detectReferencePage(text, 14);
    if (!result.isReferencePage) throw new Error('Should detect PLoS ONE references');
    if (result.confidence < 0.6) throw new Error('Confidence should be >= 0.6');
    return true;
  }
});

tests.push({
  name: 'Detect continuation reference page without header',
  fn: () => {
    const text = `
18. Shaw JE, Sicree RA, Zimmet PZ. Global estimates of the prevalence of diabetes for 2010 and 2030.
    Diabetes Res Clin Pract. 2010; 87(1):4–14. https://doi.org/10.1016/j.diabres.2009.10.007 PMID: 19896746

19. Gregg EW, Cheng YJ, Srinivasan M, Lin J, Geiss LS, Albright AL, et al. Trends in cause-specific mortality
    among adults with and without diagnosed diabetes in the USA: an epidemiological analysis of linked
    national survey and vital statistics data. Lancet. 2018; 391(10138):2430–40. PMID: 29784146

20. Tancredi M, Rosengren A, Svensson AM, Kosiborod M, Pivodic A, Gudbjörnsdottir S, et al. Excess Mortality
    among Persons with Type 2 Diabetes. N Engl J Med. 2015; 373(18):1720–32. PMID: 26510021
    `;
    const result = detectReferencePage(text, 15);
    if (!result.isReferencePage) throw new Error('Should detect continuation page as references');
    if (result.stats.numberedEntries < 2) throw new Error('Should have at least 2 numbered entries');
    return true;
  }
});

// ============================================
// Run all tests
// ============================================

let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    test.fn();
    console.log(`✓ ${test.name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${test.name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

console.log('');
console.log('='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
