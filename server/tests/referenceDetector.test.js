/**
 * Reference Detector Tests
 *
 * Tests for the reference page detection module that prevents AI hallucination
 * when processing bibliography pages.
 *
 * v2.0: Added tests for mixed content pages (pages with both substantive
 * content AND references, like Conclusion + References on same page)
 */

import {
  detectReferencePage,
  generateReferencePageResponse,
  hasSubstantiveContent,
  analyzePageContent,
  findImportantSections,
  findReferencesSectionStart,
  extractContentBeforeReferences,
  generateMixedContentResponse,
  PAGE_CLASSIFICATION
} from '../utils/referenceDetector.js';

describe('Reference Detector', () => {

  describe('detectReferencePage', () => {

    it('should detect page with "References" header and DOIs', () => {
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

      expect(result.isReferencePage).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.reasons).toContain('Contains "References" or similar header');
      expect(result.stats.doiCount).toBe(3);
    });

    it('should detect page with numbered entries and journal citations', () => {
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

      expect(result.isReferencePage).toBe(true);
      expect(result.stats.journalCitations).toBeGreaterThanOrEqual(3);
      expect(result.stats.etAlCount).toBeGreaterThanOrEqual(1);
    });

    it('should detect page with PMID patterns', () => {
      const text = `
References

1. Author A, Author B. Title of study. Journal. 2020. PMID: 32456789
2. Author C, Author D. Another study. Journal. 2019. PMID: 31234567
3. Author E, et al. Third study. Journal. 2021. PMID: 33789012
      `;

      const result = detectReferencePage(text, 16);

      expect(result.isReferencePage).toBe(true);
      expect(result.stats.pmidCount).toBe(3);
    });

    it('should NOT detect page with actual medical content', () => {
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

      expect(result.isReferencePage).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should NOT detect page with results and statistics', () => {
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

      expect(result.isReferencePage).toBe(false);
    });

    it('should handle empty or null input', () => {
      expect(detectReferencePage('', 1).isReferencePage).toBe(false);
      expect(detectReferencePage(null, 1).isReferencePage).toBe(false);
      expect(detectReferencePage(undefined, 1).isReferencePage).toBe(false);
    });

    it('should detect Spanish references section', () => {
      const text = `
Referencias

1. García P, López M, Martínez R, et al. Prevalencia de diabetes en población adulta.
   Rev Med Chile. 2020;148(3):345-352. doi:10.4067/S0034-98872020000300345

2. Rodríguez A, Fernández B. Factores de riesgo cardiovascular.
   Med Clin (Barc). 2019;153(7):278-284. doi:10.1016/j.medcli.2019.01.023
      `;

      const result = detectReferencePage(text, 14);

      expect(result.isReferencePage).toBe(true);
      expect(result.reasons).toContain('Contains "References" or similar header');
    });

  });

  describe('generateReferencePageResponse', () => {

    it('should generate appropriate response message', () => {
      const detection = {
        isReferencePage: true,
        confidence: 0.85,
        reasons: ['Contains "References" or similar header', 'Contains 5 DOI patterns'],
        pageNumber: 14,
        stats: { doiCount: 5, pmidCount: 0 }
      };

      const response = generateReferencePageResponse(14, detection);

      expect(response).toContain('página (14)');
      expect(response).toContain('referencias bibliográficas');
      expect(response).toContain('85%');
      expect(response).toContain('No hay contenido médico sustantivo');
    });

    it('should handle empty reasons array', () => {
      const detection = {
        isReferencePage: true,
        confidence: 0.6,
        reasons: [],
        pageNumber: 15,
        stats: {}
      };

      const response = generateReferencePageResponse(15, detection);

      expect(response).toContain('página (15)');
      expect(response).not.toContain('()');
    });

  });

  describe('hasSubstantiveContent', () => {

    it('should return true for page with medical methodology content', () => {
      const text = `
This prospective cohort study enrolled 5,000 patients with type 2 diabetes.
The primary outcome was cardiovascular mortality. Statistical analysis was
performed using Cox regression. Results showed a significant reduction in
mortality rates (HR 0.75, 95% CI 0.65-0.87, p < 0.001).
      `;

      const result = hasSubstantiveContent(text);

      expect(result.hasContent).toBe(true);
    });

    it('should return false for reference-only page', () => {
      const text = `
References

1. Smith J, et al. Journal. 2020;45(3):123. doi:10.1234/example
2. Jones A, et al. Journal. 2019;44(2):456. doi:10.1234/example2
3. Brown B, et al. Journal. 2021;46(1):789. doi:10.1234/example3
      `;

      const result = hasSubstantiveContent(text);

      expect(result.hasContent).toBe(false);
      expect(result.reason).toContain('references');
    });

    it('should return false for very short text', () => {
      const text = 'Page 14';

      const result = hasSubstantiveContent(text);

      expect(result.hasContent).toBe(false);
      expect(result.reason).toContain('too short');
    });

    it('should return false for empty input', () => {
      expect(hasSubstantiveContent('').hasContent).toBe(false);
      expect(hasSubstantiveContent(null).hasContent).toBe(false);
    });

    it('should detect Spanish medical content', () => {
      const text = `
El estudio incluyó 3,500 pacientes con diabetes tipo 2. Los resultados
mostraron una reducción significativa en los eventos cardiovasculares.
El método utilizado fue un ensayo clínico aleatorizado. Las conclusiones
indican que el tratamiento es efectivo para prevenir complicaciones.
      `;

      const result = hasSubstantiveContent(text);

      expect(result.hasContent).toBe(true);
    });

  });

  describe('Real-world reference page examples', () => {

    it('should detect typical PLoS ONE reference format', () => {
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

      expect(result.isReferencePage).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should detect continuation reference page without header', () => {
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

      expect(result.isReferencePage).toBe(true);
      expect(result.stats.numberedEntries).toBeGreaterThanOrEqual(2);
    });

  });

  // ============================================
  // NEW TESTS FOR MIXED CONTENT PAGES (v2.0)
  // ============================================

  describe('findImportantSections', () => {

    it('should find Conclusion section header', () => {
      const text = `
Some content here.

Conclusión

El estudio demuestra que los modelos 3D mejoran la planificación quirúrgica.
      `;

      const sections = findImportantSections(text);

      expect(sections.length).toBe(1);
      expect(sections[0].name).toBe('Conclusión');
    });

    it('should find multiple important sections', () => {
      const text = `
Complicaciones

Se reportaron las siguientes complicaciones post-operatorias...

Limitaciones

El estudio tiene varias limitaciones incluyendo el tamaño de muestra pequeño.

Conclusión

En conclusión, el tratamiento es efectivo.
      `;

      const sections = findImportantSections(text);

      expect(sections.length).toBe(3);
      expect(sections.map(s => s.name)).toContain('Complicaciones');
      expect(sections.map(s => s.name)).toContain('Limitaciones');
      expect(sections.map(s => s.name)).toContain('Conclusión');
    });

    it('should find English section headers', () => {
      const text = `
Discussion

The results indicate a significant improvement in patient outcomes.

Limitations

This study has several limitations that should be considered.

Conclusions

We conclude that the intervention is effective.
      `;

      const sections = findImportantSections(text);

      expect(sections.length).toBe(3);
      expect(sections.map(s => s.name)).toContain('Discussion');
      expect(sections.map(s => s.name)).toContain('Limitations');
      expect(sections.map(s => s.name)).toContain('Conclusions');
    });

    it('should return empty array for text without important sections', () => {
      const text = `
1. Smith J, et al. Journal. 2020;45(3):123. doi:10.1234/example
2. Jones A, et al. Journal. 2019;44(2):456. doi:10.1234/example2
      `;

      const sections = findImportantSections(text);

      expect(sections.length).toBe(0);
    });

    it('should handle empty input', () => {
      expect(findImportantSections('')).toEqual([]);
      expect(findImportantSections(null)).toEqual([]);
    });

  });

  describe('findReferencesSectionStart', () => {

    it('should find References header position', () => {
      const text = `
Conclusión

El estudio aporta evidencia sobre los beneficios.

Referencias

1. Author A, et al. Journal. 2020;45(3):123.
      `;

      const result = findReferencesSectionStart(text);

      expect(result).not.toBeNull();
      expect(result.headerText).toBe('Referencias');
      expect(result.lineIndex).toBeGreaterThan(0);
    });

    it('should find English References header', () => {
      const text = `
Conclusion

The study provides evidence for the benefits.

References

1. Author A, et al. Journal. 2020;45(3):123.
      `;

      const result = findReferencesSectionStart(text);

      expect(result).not.toBeNull();
      expect(result.headerText).toBe('References');
    });

    it('should return null when no References section exists', () => {
      const text = `
Results

The primary outcome showed significant improvement.
Statistical analysis revealed p < 0.001.
      `;

      const result = findReferencesSectionStart(text);

      expect(result).toBeNull();
    });

  });

  describe('extractContentBeforeReferences', () => {

    it('should extract content before References section', () => {
      const text = `Conclusión

El estudio aporta evidencia importante.

Los hallazgos muestran mejoras significativas.

Referencias

1. Author A. Title. Journal. 2020.`;

      const refSection = findReferencesSectionStart(text);
      const extracted = extractContentBeforeReferences(text, refSection);

      expect(extracted).toContain('Conclusión');
      expect(extracted).toContain('evidencia importante');
      expect(extracted).not.toContain('1. Author A');
    });

    it('should return full text when refSection is null', () => {
      const text = 'Some content without references';

      const extracted = extractContentBeforeReferences(text, null);

      expect(extracted).toBe(text);
    });

  });

  describe('analyzePageContent - Tripartite Classification', () => {

    it('should classify page with Conclusion + References as MIXED_CONTENT', () => {
      // Simulating the real-world example from the image (page 8)
      const text = `
Complicaciones. Tal como se mencionó, hubo una tasa baja de complicaciones
con una parestesia temporal que resolvió a los 50 días postoperatorios.
Se comprobó lesión incompleta por electromiografía con sintomatología de
limitación a la flexión, extensión y eversión de pie.

Limitaciones. A pesar de los resultados prometedores, es importante
destacar algunas limitaciones del estudio. En primer lugar, la muestra
es relativamente pequeña (22 pacientes), aunque se trata de patologías
con una incidencia poco frecuente.

Conclusión

El estudio aporta evidencia sobre los beneficios de utilizar modelos 3D
impresos para la planificación de ATC complejas.

Referencias

1. Learmonth ID, Young C, Rorabeck C. The operation of the century:
   total hip replacement. Lancet. 2007; 370(9597): 1508-19.

2. Knight SR, Aujla R, Biswas SP. Total hip arthroplasty - over 100 years
   of operative history. Orthop Rev (Pavia). 2011; 3(2): e16.

3. Gallart X, Riba J, Fernández-Valencia JA, et al. Hip prostheses in young adults.
   Rev Esp Cir Ortop Traumatol. 2018; 62(2): 142-52.
      `;

      const result = analyzePageContent(text, 8);

      expect(result.classification).toBe(PAGE_CLASSIFICATION.MIXED_CONTENT);
      expect(result.importantSections.length).toBeGreaterThan(0);
      expect(result.extractableText).toContain('Complicaciones');
      expect(result.extractableText).toContain('Limitaciones');
      expect(result.extractableText).toContain('Conclusión');
      expect(result.extractableText).not.toContain('1. Learmonth ID');
    });

    it('should classify pure reference page as PURE_REFERENCES', () => {
      const text = `
Referencias

1. Smith J, Jones A, et al. Clinical outcomes study. Diabetes Care. 2020;43(5):1123-1130.
   doi:10.1234/dc20-1234

2. Johnson K, Williams M. Risk factors analysis. J Am Coll Cardiol. 2019;74(12):1567-1575.
   doi:10.1234/jacc19-5678

3. Garcia R, Martinez L, et al. Prevalence study. Ann Intern Med. 2021;175(3):345-352.
   doi:10.1234/aim21-9012

4. Lee S, Kim H. Long-term outcomes. Obesity. 2018;26(8):1298-1305.
   doi:10.1234/oby18-3456
      `;

      const result = analyzePageContent(text, 14);

      expect(result.classification).toBe(PAGE_CLASSIFICATION.PURE_REFERENCES);
      expect(result.extractableText).toBe('');
    });

    it('should classify normal content page as SUBSTANTIVE_CONTENT', () => {
      const text = `
Métodos

Diseño del estudio y participantes
Este fue un estudio de cohorte prospectivo realizado en múltiples centros.
Se incluyeron 7,500 pacientes con diabetes tipo 2 que cumplían los criterios de inclusión.

El desenlace primario fue la incidencia de eventos cardiovasculares mayores (MACE),
definido como un compuesto de muerte cardiovascular, infarto de miocardio no fatal,
o accidente cerebrovascular no fatal.

Análisis estadístico
Se utilizó regresión de riesgos proporcionales de Cox para estimar hazard ratios (HR)
con intervalos de confianza del 95%.
      `;

      const result = analyzePageContent(text, 5);

      expect(result.classification).toBe(PAGE_CLASSIFICATION.SUBSTANTIVE_CONTENT);
      expect(result.extractableText).toBe(text.trim());
    });

    it('should detect content before References even without explicit important headers', () => {
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

      // Should detect as MIXED_CONTENT because there's substantive content before references
      expect(result.classification).toBe(PAGE_CLASSIFICATION.MIXED_CONTENT);
      expect(result.extractableText).toContain('hazard ratio');
      expect(result.extractableText).not.toContain('1. Author A');
    });

    it('should handle empty input', () => {
      const result = analyzePageContent('', 1);

      expect(result.classification).toBe(PAGE_CLASSIFICATION.SUBSTANTIVE_CONTENT);
      expect(result.extractableText).toBe('');
    });

    it('should handle null input', () => {
      const result = analyzePageContent(null, 1);

      expect(result.classification).toBe(PAGE_CLASSIFICATION.SUBSTANTIVE_CONTENT);
      expect(result.reasons).toContain('No text provided');
    });

  });

  describe('generateMixedContentResponse', () => {

    it('should generate appropriate message for mixed content page', () => {
      const analysis = {
        classification: PAGE_CLASSIFICATION.MIXED_CONTENT,
        pageNumber: 8,
        importantSections: [
          { name: 'Conclusión', lineIndex: 10, position: 500 },
          { name: 'Limitaciones', lineIndex: 5, position: 200 }
        ],
        extractableText: 'Some extracted content here that is long enough to matter',
        confidence: 0.9
      };

      const response = generateMixedContentResponse(8, analysis);

      expect(response).toContain('Página 8');
      expect(response).toContain('mixto');
      expect(response).toContain('Conclusión');
      expect(response).toContain('Limitaciones');
    });

    it('should handle analysis without important sections', () => {
      const analysis = {
        classification: PAGE_CLASSIFICATION.MIXED_CONTENT,
        pageNumber: 10,
        importantSections: [],
        extractableText: 'Content extracted from before references section',
        confidence: 0.75
      };

      const response = generateMixedContentResponse(10, analysis);

      expect(response).toContain('Página 10');
      expect(response).toContain('contenido previo');
    });

  });

  describe('PAGE_CLASSIFICATION enum', () => {

    it('should have all expected classification types', () => {
      expect(PAGE_CLASSIFICATION.PURE_REFERENCES).toBe('PURE_REFERENCES');
      expect(PAGE_CLASSIFICATION.MIXED_CONTENT).toBe('MIXED_CONTENT');
      expect(PAGE_CLASSIFICATION.SUBSTANTIVE_CONTENT).toBe('SUBSTANTIVE_CONTENT');
    });

  });

  describe('Real-world mixed content examples', () => {

    it('should handle Spanish medical article page with Conclusion and References', () => {
      // Based on the actual image provided - page 218 / page 8 of the PDF
      const text = `
Godoy-Monzón D y cols.

Además, la duración de la cirugía (promedio de 71 minutos) y la minimización
de la pérdida sanguínea (260 ± 90 ml) reflejan un procedimiento quirúrgico eficiente.

Complicaciones. Tal como se mencionó, hubo una tasa baja de complicaciones
con una parestesia temporal que resolvió a los 50 días postoperatorios.

Limitaciones. A pesar de los resultados prometedores, es importante destacar
algunas limitaciones del estudio. En primer lugar, la muestra es relativamente
pequeña (22 pacientes). Además, el seguimiento promedio de 40.7 meses puede
no ser suficiente para evaluar completamente la longevidad del implante.

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
      `;

      const result = analyzePageContent(text, 8);

      // Must be classified as MIXED_CONTENT
      expect(result.classification).toBe(PAGE_CLASSIFICATION.MIXED_CONTENT);

      // Must find the important sections
      expect(result.importantSections.length).toBeGreaterThan(0);
      const sectionNames = result.importantSections.map(s => s.name);
      expect(sectionNames.some(n => n.includes('Conclusión'))).toBe(true);

      // Extracted text must contain the valuable content
      expect(result.extractableText).toContain('Complicaciones');
      expect(result.extractableText).toContain('Limitaciones');
      expect(result.extractableText).toContain('evidencia');

      // Extracted text must NOT contain references
      expect(result.extractableText).not.toContain('Learmonth ID');
      expect(result.extractableText).not.toContain('Knight SR');
      expect(result.extractableText).not.toContain('Lancet. 2007');
    });

    it('should correctly handle English Discussion + References page', () => {
      const text = `
Discussion

Our findings demonstrate a significant reduction in cardiovascular events
among patients receiving the intensive treatment protocol. The hazard ratio
of 0.72 (95% CI: 0.61-0.85, p < 0.001) represents a clinically meaningful
improvement compared to standard care.

Limitations

This study has several limitations. First, the sample size was relatively
small, limiting the generalizability of our findings. Second, the follow-up
period of 3 years may not capture long-term outcomes.

Conclusions

In conclusion, intensive glucose control significantly reduces cardiovascular
events in patients with type 2 diabetes. These findings support the
implementation of more aggressive treatment protocols in clinical practice.

References

1. UK Prospective Diabetes Study Group. Intensive blood-glucose control with
   sulphonylureas or insulin compared with conventional treatment. Lancet.
   1998; 352(9131): 837-53.

2. Action to Control Cardiovascular Risk in Diabetes Study Group. Effects of
   intensive glucose lowering in type 2 diabetes. N Engl J Med. 2008; 358(24): 2545-59.
      `;

      const result = analyzePageContent(text, 12);

      expect(result.classification).toBe(PAGE_CLASSIFICATION.MIXED_CONTENT);
      expect(result.importantSections.length).toBeGreaterThanOrEqual(2);
      expect(result.extractableText).toContain('Discussion');
      expect(result.extractableText).toContain('Limitations');
      expect(result.extractableText).toContain('Conclusions');
      expect(result.extractableText).not.toContain('UK Prospective Diabetes Study');
    });

  });

});

// Allow running tests directly with node
if (process.argv[1] && process.argv[1].endsWith('referenceDetector.test.js')) {
  console.log('Running Reference Detector Tests...\n');

  // Simple test runner for direct execution
  const tests = [
    {
      name: 'Detect page with References header and DOIs',
      fn: () => {
        const text = `References\n1. Author A. Title. doi:10.1234/test1\n2. Author B. Title. doi:10.1234/test2`;
        const result = detectReferencePage(text, 14);
        console.assert(result.isReferencePage === true, 'Should detect as reference page');
        return result.isReferencePage;
      }
    },
    {
      name: 'NOT detect methods section',
      fn: () => {
        const text = `Methods\nThis study enrolled 5000 patients with diabetes. The primary outcome was cardiovascular mortality measured over 10 years of follow-up.`;
        const result = detectReferencePage(text, 5);
        console.assert(result.isReferencePage === false, 'Should NOT detect methods as references');
        return !result.isReferencePage;
      }
    },
    {
      name: 'Generate proper response',
      fn: () => {
        const detection = { isReferencePage: true, confidence: 0.8, reasons: ['Test'], pageNumber: 14 };
        const response = generateReferencePageResponse(14, detection);
        console.assert(response.includes('página (14)'), 'Should include page number');
        return response.includes('página (14)');
      }
    },
    {
      name: 'Detect substantive content',
      fn: () => {
        const text = `This prospective study examined 3000 patients. Results showed significant reduction in mortality (HR 0.75, p < 0.001).`;
        const result = hasSubstantiveContent(text);
        console.assert(result.hasContent === true, 'Should detect substantive content');
        return result.hasContent;
      }
    },
    {
      name: 'Classify mixed content page (Conclusion + References)',
      fn: () => {
        const text = `Conclusión\n\nEl estudio demuestra beneficios significativos.\n\nReferencias\n\n1. Author A. Title. Journal. 2020;45:123.`;
        const result = analyzePageContent(text, 8);
        console.assert(result.classification === PAGE_CLASSIFICATION.MIXED_CONTENT, 'Should classify as MIXED_CONTENT');
        return result.classification === PAGE_CLASSIFICATION.MIXED_CONTENT;
      }
    },
    {
      name: 'Extract content before References',
      fn: () => {
        const text = `Conclusión\n\nHallazgos importantes aquí.\n\nReferencias\n\n1. Author. Journal. 2020.`;
        const result = analyzePageContent(text, 8);
        const hasConclusion = result.extractableText.includes('Conclusión');
        const noRefs = !result.extractableText.includes('1. Author');
        console.assert(hasConclusion && noRefs, 'Should extract content before references');
        return hasConclusion && noRefs;
      }
    },
    {
      name: 'Find important sections',
      fn: () => {
        const text = `Complicaciones\n\nTexto.\n\nLimitaciones\n\nTexto.`;
        const sections = findImportantSections(text);
        console.assert(sections.length === 2, 'Should find 2 important sections');
        return sections.length === 2;
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = test.fn();
      if (result) {
        console.log(`✓ ${test.name}`);
        passed++;
      } else {
        console.log(`✗ ${test.name}`);
        failed++;
      }
    } catch (error) {
      console.log(`✗ ${test.name}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
