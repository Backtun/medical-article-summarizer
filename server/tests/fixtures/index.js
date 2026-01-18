/**
 * Test Fixtures - Sample Data for Testing
 *
 * Contains mock data structures for unit and integration tests
 */

// Sample PDF text content (simulated extraction)
export const SAMPLE_MEDICAL_TEXT = `
INTRODUCTION

Cardiovascular disease (CVD) remains the leading cause of mortality worldwide. 
Recent studies have shown that early intervention can significantly reduce 
mortality rates in high-risk populations.

OBJECTIVE: To evaluate the effectiveness of a novel intervention program 
in reducing cardiovascular events in patients with type 2 diabetes.

METHODS

Study Design: Randomized controlled trial
Population: Adults aged 45-75 with type 2 diabetes
Sample Size: 500 participants (250 per group)
Duration: 24 months follow-up

Intervention group received:
- Weekly exercise sessions
- Dietary counseling
- Medication optimization

Control group received standard care.

RESULTS

Primary Outcome: Cardiovascular events
- Intervention group: 15 events (6%)
- Control group: 38 events (15.2%)
- Relative risk reduction: 60.5%
- p-value: <0.001

Secondary Outcomes:
- HbA1c reduction: -1.2% vs -0.3% (p<0.001)
- Weight loss: -5.2kg vs -1.1kg (p<0.001)

DISCUSSION

Our findings demonstrate that a comprehensive intervention program 
significantly reduces cardiovascular events in diabetic patients.

Limitations:
- Single-center study
- Predominantly urban population
- High dropout rate in control group (12%)

CONCLUSION

A multifaceted intervention program is effective in reducing 
cardiovascular morbidity in patients with type 2 diabetes.
`;

// Sample non-medical text
export const SAMPLE_NON_MEDICAL_TEXT = `
Chapter 1: Introduction to Computer Science

This textbook covers the fundamentals of computer science,
including algorithms, data structures, and programming concepts.

1.1 What is Computer Science?

Computer science is the study of computation and information processing.
It encompasses both theoretical and practical aspects of computing.
`;

// Sample PDF metadata
export const SAMPLE_METADATA = {
  Title: 'Cardiovascular Risk Reduction in Diabetic Patients',
  Author: 'Smith J, Johnson M, Williams K',
  Subject: 'Clinical Trial',
  Creator: 'Microsoft Word',
  Producer: 'Adobe PDF Library',
  CreationDate: 'D:20250115120000',
  ModDate: 'D:20250116140000'
};

// Sample analyzed pages
export const SAMPLE_ANALYZED_PAGES = [{
    pageNumber: 1,
    analysis: `## Página 1 - Introducción

**Contexto:** Enfermedad cardiovascular como principal causa de mortalidad.

**Objetivo del estudio:** Evaluar intervención en pacientes diabéticos.

**Puntos clave:**
- CVD es la principal causa de muerte mundial
- Intervención temprana reduce mortalidad`,
    text: SAMPLE_MEDICAL_TEXT.substring(0, 500)
  },
  {
    pageNumber: 2,
    analysis: `## Página 2 - Métodos

**Diseño:** Ensayo controlado aleatorizado

**Población:** Adultos 45-75 años con diabetes tipo 2

**Tamaño de muestra:** 500 participantes

**Intervenciones:**
- Ejercicio semanal
- Asesoría dietética
- Optimización de medicación`,
    text: SAMPLE_MEDICAL_TEXT.substring(500, 1000)
  },
  {
    pageNumber: 3,
    analysis: `## Página 3 - Resultados

**Resultado primario:** Eventos cardiovasculares
- Grupo intervención: 6%
- Grupo control: 15.2%
- RRR: 60.5% (p<0.001)

**Resultados secundarios:**
- Reducción HbA1c: -1.2% vs -0.3%
- Pérdida de peso: -5.2kg vs -1.1kg`,
    text: SAMPLE_MEDICAL_TEXT.substring(1000, 1500)
  }
];

// Sample document structure
export const SAMPLE_STRUCTURE = {
  parts: [{
    id: 'part-1',
    number: '1',
    title: 'Artículo Médico',
    startPage: 1,
    chapters: []
  }],
  chapters: [],
  sections: [],
  imryd: {
    abstract: null,
    introduction: {
      startPage: 1,
      title: 'INTRODUCTION',
      detected: true
    },
    methods: {
      startPage: 2,
      title: 'METHODS',
      detected: true
    },
    results: {
      startPage: 3,
      title: 'RESULTS',
      detected: true
    },
    discussion: {
      startPage: 3,
      title: 'DISCUSSION',
      detected: true
    },
    references: null
  },
  isIMRyDFormat: true
};

// Sample processing result
export const SAMPLE_PROCESSING_RESULT = {
  title: 'Cardiovascular Risk Reduction in Diabetic Patients',
  fileName: 'sample_medical_article.pdf',
  totalPages: 3,
  structure: SAMPLE_STRUCTURE,
  pages: SAMPLE_ANALYZED_PAGES,
  summary: `# Resumen IMRyD

## Introducción
Evaluación de programa de intervención para reducir eventos cardiovasculares.

## Métodos
- Diseño: Ensayo controlado aleatorizado
- Población: 500 pacientes diabéticos
- Duración: 24 meses

## Resultados
- Reducción de eventos CV: 60.5%
- p-valor: <0.001

## Discusión
Intervención multifacética efectiva en reducir morbilidad cardiovascular.

---
⚠️ Este resumen es informativo y no constituye consejo médico.`,
  groupedContent: {},
  metadata: SAMPLE_METADATA,
  processedAt: new Date().toISOString(),
  documentHash: 'abc123def456',
  disclaimer: 'Este resumen es informativo y no constituye consejo médico.'
};

// Expected IMRyD JSON output
export const EXPECTED_IMRYD_JSON = {
  metadata: {
    titulo: 'Cardiovascular Risk Reduction in Diabetic Patients',
    autores: ['Smith J', 'Johnson M', 'Williams K'],
    fecha_publicacion: '2025',
    tipo_estudio: 'Ensayo controlado aleatorizado'
  },
  introduccion: {
    contexto: 'Enfermedad cardiovascular como principal causa de mortalidad.',
    objetivo_principal: 'Evaluar intervención en pacientes diabéticos'
  },
  metodos: {
    diseno: 'Ensayo controlado aleatorizado',
    poblacion: 'Adultos 45-75 años con diabetes tipo 2',
    tamano_muestra: '500 participantes'
  },
  resultados: {
    hallazgos_principales: [{
      descripcion: 'Reducción de eventos cardiovasculares',
      valor: '60.5%',
      valor_p: '<0.001'
    }]
  },
  discusion: {
    interpretacion: 'Intervención multifacética efectiva',
    limitaciones: [
      'Estudio de un solo centro',
      'Población predominantemente urbana'
    ]
  },
  puntos_clave: [
    'Reducción significativa de eventos CV',
    'Mejora en control glucémico',
    'Pérdida de peso sostenida'
  ],
  advertencias: [
    'Este resumen es informativo y no constituye consejo médico'
  ]
};

export default {
  SAMPLE_MEDICAL_TEXT,
  SAMPLE_NON_MEDICAL_TEXT,
  SAMPLE_METADATA,
  SAMPLE_ANALYZED_PAGES,
  SAMPLE_STRUCTURE,
  SAMPLE_PROCESSING_RESULT,
  EXPECTED_IMRYD_JSON
};