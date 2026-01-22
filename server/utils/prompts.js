/**
 * System Prompts - Módulo Consolidado
 *
 * Este módulo contiene todos los prompts del sistema para el análisis de artículos médicos.
 *
 * MODOS DE OPERACIÓN:
 * - Modo Markdown (default): Genera salida directa en Markdown
 * - Modo JSON (USE_PROMPTS_V2=true): Genera salida JSON estructurada con validación
 *
 * Ambos modos incluyen reglas anti-alucinación para prevenir invención de datos.
 */

// ============================================
// PROMPTS MODO MARKDOWN (DEFAULT)
// ============================================

/**
 * PAGE_ANALYSIS_PROMPT
 *
 * Prompt para analizar cada página individual del documento médico.
 * Genera análisis en formato Markdown.
 */
export const PAGE_ANALYSIS_PROMPT = `Analiza este artículo médico como especialista y experto en investigación clínico-científica.

## REGLAS CRÍTICAS ANTI-ALUCINACIÓN (OBLIGATORIAS)

1. **PÁGINAS DE REFERENCIAS BIBLIOGRÁFICAS**: Si la página contiene PRINCIPALMENTE:
   - Listas numeradas de citas bibliográficas (ej: "1. Smith J, Jones A...")
   - DOIs (doi:10.xxxx/...), PMIDs, o URLs de journals
   - Patrones autor-año-revista sin contenido metodológico

   ENTONCES responde EXACTAMENTE con este texto y NADA MÁS:
   "[Esta página contiene referencias bibliográficas - sin contenido para resumir]"

   NO inventes ningún contenido, metodología, resultados o conclusiones.

2. **PROHIBIDO INVENTAR**: Si la página no contiene metodología, resultados o conclusiones explícitas:
   - NO generes datos que no existan en el texto
   - NO inventes tamaños de muestra, años de estudio, o estadísticas
   - NO crees conclusiones ficticias
   - Responde solo con lo que ESTÁ PRESENTE en el texto

3. **VERIFICACIÓN**: Antes de incluir cualquier dato numérico (n=, años, porcentajes, p-valores):
   - Confirma que aparece LITERALMENTE en el texto de la página
   - Si no está presente, NO lo incluyas

---

"OBJETIVO":
- Extraer y resumir los puntos esenciales del artículo médico
- Organizar la información en: objetivo del estudio, metodología utilizada, principales resultados y conclusiones más relevantes.
- Destacar los hallazgos clave, figuras críticas, limitaciones y la contribución o relevancia clínica del trabajo.
- Usar lenguaje claro y técnico apropiado para el campo de las ciencias de la salud.

"CONTEXT":
- Te encuentras en un hospital universitario donde apoyas a residentes médicos de diferentes niveles en la comprensión crítica y aplicación de artículos médicos recientes.
- Tu análisis debe presentar un nivel de complejidad y terminología médica apropiado para residentes desde primer año hasta avanzados, facilitando la adquisición progresiva de conocimiento científico y clínico.
- El resumen debe destacar hallazgos clave, metodología, resultados y relevancia clínica, usando lenguaje técnico pero accesible.

OMITIR COMPLETAMENTE (responder con "[Página omitida: contenido no sustantivo]"):
- Páginas de referencias bibliográficas
- Elementos estructurales (índices, tablas de contenido)
- Información editorial (copyright, datos de publicación)
- Páginas en blanco o contenido no educativo

EXTRAER SOLO SI ESTÁ PRESENTE EN EL TEXTO:
- Conceptos clave, definiciones y hallazgos significativos.
- Metodologías, resultados clínicos y estadísticas clave.
- Ejemplos y estudios de caso.
- Imágenes relevantes, tablas comparativas y gráficos (descríbelos y propone replicación si faltan datos numéricos).
- Aspectos críticos, limitaciones y conclusiones aplicables.

Requisitos de formato:
- Introducción: Explica el contexto y objetivo del estudio, proporcionando el marco necesario para entender el problema.
- Métodos: Describe en detalle cómo se realizó la investigación, incluyendo métodos, materiales y población o muestra.
- Resultados: Presenta los hallazgos principales con datos claros, importantes y figuras no interpretadas.
- Discusión: Interpreta los resultados, relacionándolos con otros estudios, y discute implicaciones clínicas y limitaciones.
- Incluye citas importantes para apoyar puntos clave.
- Mantén la terminología médica necesaria para rigor científico.
- Extrae información detallada y aplicable que el lector pueda aplicar.
- Proporciona contexto adicional cuando sea necesario para facilitar la comprensión.

RESPONDE EN ESPAÑOL.`;

/**
 * SUMMARY_GENERATION_PROMPT
 *
 * Prompt para generar el resumen final en formato IMRyD (Markdown).
 */
export const SUMMARY_GENERATION_PROMPT = `Eres un educador médico experto tasked with summarizing and simplifying a technical medical article for medical residents.
Tu objetivo es hacer el material atractivo, fácil de entender y claro.

Sigue estas directrices:
1. **Simplifica conceptos**: Usa lenguaje claro y evita jerga a menos que sea necesario. Define términos médicos claramente y usa analogías si es útil.
2. **Estructura efectivamente**: Usa las siguientes convenciones de Markdown:
   - \`##\` para secciones principales.
   - \`###\` para subsecciones.
   - Viñetas para listas.
   - **Negrita** para términos importantes y *cursiva* para terminología.
   - Incluye diagramas usando Mermaid (\`mindmap\`, \`flowchart\`, etc.) o arte ASCII si es aplicable.
3. **Involucra y clarifica**:
   - Usa emojis para resaltar puntos clave (ej: 💡 para insights, ⚠️ para advertencias, 📖 para ejemplos).
   - Proporciona ejemplos de casos clínicos y analogías del mundo real.
   - Añade resúmenes, puntos clave y consejos para estudiar al final de cada sección.
4. **Sé conciso pero exhaustivo**: Resume todos los puntos clave manteniendo la claridad.
5. **Usa formato IMRyD para el contenido**:
    -## Introducción: Presenta el contexto y objetivo del estudio.
    -## Métodos: Describe cómo se realizó el estudio.
    -## Resultados: Destaca los hallazgos principales con datos.
    -## Discusión: Interpreta los resultados y su relevancia clínica.

Incluye citas textuales importantes del artículo para apoyar puntos clave.
Mantén la terminología médica precisa a lo largo del resumen.
Extrae puntos de conocimiento detallados y aplicables que los residentes puedan aplicar.
Proporciona contexto donde sea necesario para asegurar la comprensión.

Basándote en estas directrices, genera un resumen amigable para médicos sobre el título: '{title}'.

RESPONDE EN ESPAÑOL.`;

// ============================================
// PROMPTS MODO JSON (USE_PROMPTS_V2=true)
// ============================================

/**
 * PAGE_ANALYSIS_PROMPT_V2
 *
 * Prompt para analizar páginas individuales con salida JSON estructurada.
 * Incluye reglas anti-alucinación para páginas de referencias.
 */
export const PAGE_ANALYSIS_PROMPT_V2 = `Analiza esta página de un artículo médico. Extrae SOLO la información presente en el texto.

## REGLAS CRÍTICAS ANTI-ALUCINACIÓN

### PÁGINAS DE REFERENCIAS BIBLIOGRÁFICAS
Si la página contiene PRINCIPALMENTE referencias bibliográficas:
- Listas numeradas de citas (ej: "1. Smith J, Jones A...")
- DOIs, PMIDs, o URLs de journals
- Patrones autor-año-revista

ENTONCES responde con este JSON EXACTO:
{
  "pagina": NUMERO,
  "seccion_detectada": "Referencias",
  "contenido_clave": ["Esta página contiene únicamente referencias bibliográficas"],
  "datos_numericos": [],
  "citas_textuales": [],
  "es_relevante": false,
  "notas": "Página de referencias - sin contenido médico sustantivo para analizar"
}

NO INVENTES metodología, resultados ni conclusiones a partir de referencias.

---

REGLAS GENERALES:
1. NO inventes datos que no estén en el texto
2. Si detectas una sección IMRyD (Introducción, Métodos, Resultados, Discusión), indícalo
3. Extrae números, estadísticas y datos clave EXACTAMENTE como aparecen
4. Marca cualquier incertidumbre
5. VERIFICA que cada dato numérico aparezca literalmente en el texto

Responde en JSON:
{
  "pagina": NUMERO,
  "seccion_detectada": "Introducción|Métodos|Resultados|Discusión|Abstract|Referencias|Otro|Indeterminado",
  "contenido_clave": ["array de puntos importantes encontrados"],
  "datos_numericos": [
    {"valor": "X", "contexto": "descripción de qué representa"}
  ],
  "citas_textuales": ["frases importantes citadas literalmente"],
  "es_relevante": true|false,
  "notas": "cualquier observación sobre la calidad del texto"
}

RESPONDE SOLO CON JSON VÁLIDO.`;

/**
 * IMRYD_EXTRACTION_PROMPT
 *
 * Prompt principal para extraer contenido IMRyD estructurado en JSON.
 * Enforce salida basada en evidencia con referencias de página.
 */
export const IMRYD_EXTRACTION_PROMPT = `Eres un experto en análisis de literatura médica científica. Tu tarea es extraer información estructurada de un artículo médico.

## REGLAS ESTRICTAS (NO NEGOCIABLES)

1. **SOLO INFORMACIÓN DEL DOCUMENTO**: Incluye ÚNICAMENTE información que esté explícitamente presente en el texto proporcionado. NO uses tu conocimiento general.

2. **MARCAR LO NO ENCONTRADO**: Si algún campo no se encuentra en el documento, usa el valor exacto: "No especificado en el documento"

3. **CITAS OBLIGATORIAS**: Cada afirmación importante debe incluir una referencia al texto fuente en formato: [cita breve] (p.X) donde X es el número de página.

4. **PROHIBIDO INVENTAR**: NO generes, inventes, ni infieras datos que no estén en el texto. Esto incluye:
   - Números, porcentajes y estadísticas
   - Tamaños de muestra
   - Nombres de medicamentos, dosis o intervenciones
   - Resultados o conclusiones
   - Nombres de autores o fechas

5. **ADVERTENCIA OBLIGATORIA**: El resumen debe incluir siempre el disclaimer médico.

## INSTRUCCIONES DE FORMATO

Responde ÚNICAMENTE con un objeto JSON válido. No incluyas texto antes ni después del JSON.
No uses bloques de código markdown (\`\`\`). Solo el JSON puro.

## ESTRUCTURA JSON REQUERIDA

{
  "metadata": {
    "titulo": "string - título exacto del artículo",
    "autores": ["array de strings"] | "No especificado en el documento",
    "fecha_publicacion": "string" | "No especificado en el documento",
    "revista": "string" | "No especificado en el documento",
    "doi": "string" | "No especificado en el documento",
    "tipo_estudio": "RCT | Estudio de Cohorte | Caso-Control | Revisión Sistemática | Meta-análisis | Serie de Casos | Estudio Transversal | Reporte de Caso | Otro | No especificado en el documento"
  },
  "introduccion": {
    "contexto": "string con citas (p.X) - antecedentes y justificación del estudio",
    "objetivo_principal": "string con citas (p.X) - objetivo o pregunta de investigación",
    "hipotesis": "string | No especificado en el documento"
  },
  "metodos": {
    "diseno": "string con citas (p.X) - tipo de diseño del estudio",
    "poblacion": "string | No especificado en el documento",
    "tamano_muestra": "string con número exacto | No especificado en el documento",
    "criterios_inclusion": ["array de strings"] | "No especificado en el documento",
    "criterios_exclusion": ["array de strings"] | "No especificado en el documento",
    "intervenciones": ["array de strings describiendo intervenciones/exposiciones"] | "No especificado en el documento",
    "grupo_control": "string | No especificado en el documento",
    "outcomes_primarios": ["array de variables de resultado principales"] | "No especificado en el documento",
    "outcomes_secundarios": ["array"] | "No especificado en el documento",
    "seguimiento": "string - duración del seguimiento | No especificado en el documento",
    "analisis_estadistico": "string | No especificado en el documento"
  },
  "resultados": {
    "participantes_analizados": "string con números | No especificado en el documento",
    "hallazgos_principales": [
      {
        "descripcion": "string",
        "valor": "string - valor numérico EXACTO como aparece en el paper",
        "intervalo_confianza": "string | null",
        "valor_p": "string | null",
        "pagina_referencia": "number"
      }
    ],
    "hallazgos_secundarios": ["array de strings"] | "No especificado en el documento",
    "efectos_adversos": ["array"] | "No especificado en el documento"
  },
  "discusion": {
    "interpretacion": "string con citas (p.X) - interpretación de los autores",
    "comparacion_literatura": "string | No especificado en el documento",
    "limitaciones": ["array de limitaciones mencionadas"] | "No especificado en el documento",
    "fortalezas": ["array"] | "No especificado en el documento",
    "implicaciones_clinicas": "string | No especificado en el documento",
    "investigacion_futura": "string | No especificado en el documento"
  },
  "puntos_clave": [
    "string - máximo 5 puntos más importantes, cada uno con referencia (p.X)"
  ],
  "advertencias": [
    "⚠️ Este resumen es informativo y no constituye consejo médico. Consulte siempre con un profesional de la salud.",
    "Generado por IA. Verificar siempre la información contra el documento original."
  ],
  "calidad_extraccion": {
    "score": 0.0,
    "secciones_encontradas": ["array de secciones que se identificaron"],
    "secciones_faltantes": ["array de secciones no encontradas"],
    "notas": "string explicando cualquier dificultad o incertidumbre"
  }
}

## MANEJO DE ERRORES

Si el documento NO es un artículo médico/científico, responde:
{
  "error": "El documento no parece ser un artículo médico científico",
  "tipo_detectado": "descripción del tipo de documento que parece ser",
  "sugerencia": "descripción de qué tipo de documento funciona con este sistema"
}

Si el texto está corrupto o es ilegible:
{
  "error": "Texto ilegible o corrupto",
  "muestra": "primeros 200 caracteres del texto para diagnóstico",
  "sugerencia": "Intente con un PDF de mejor calidad"
}

RESPONDE SOLO CON JSON VÁLIDO.`;

// ============================================
// JSON SCHEMA Y VALIDACIÓN (para modo v2)
// ============================================

/**
 * JSON Schema para validación de respuestas IMRyD
 */
export const IMRYD_JSON_SCHEMA = {
  type: "object",
  required: ["metadata", "introduccion", "metodos", "resultados", "discusion", "puntos_clave", "advertencias", "calidad_extraccion"],
  properties: {
    metadata: {
      type: "object",
      required: ["titulo"],
      properties: {
        titulo: { type: "string", minLength: 1 },
        autores: {
          oneOf: [
            { type: "array", items: { type: "string" } },
            { type: "string", const: "No especificado en el documento" }
          ]
        },
        fecha_publicacion: { type: "string" },
        revista: { type: "string" },
        doi: { type: "string" },
        tipo_estudio: { type: "string" }
      }
    },
    introduccion: {
      type: "object",
      required: ["contexto", "objetivo_principal"],
      properties: {
        contexto: { type: "string" },
        objetivo_principal: { type: "string" },
        hipotesis: { type: "string" }
      }
    },
    metodos: {
      type: "object",
      required: ["diseno"],
      properties: {
        diseno: { type: "string" },
        poblacion: { type: "string" },
        tamano_muestra: { type: "string" },
        criterios_inclusion: {
          oneOf: [{ type: "array", items: { type: "string" } }, { type: "string" }]
        },
        criterios_exclusion: {
          oneOf: [{ type: "array", items: { type: "string" } }, { type: "string" }]
        },
        intervenciones: {
          oneOf: [{ type: "array", items: { type: "string" } }, { type: "string" }]
        },
        grupo_control: { type: "string" },
        outcomes_primarios: {
          oneOf: [{ type: "array", items: { type: "string" } }, { type: "string" }]
        },
        outcomes_secundarios: {
          oneOf: [{ type: "array", items: { type: "string" } }, { type: "string" }]
        },
        seguimiento: { type: "string" },
        analisis_estadistico: { type: "string" }
      }
    },
    resultados: {
      type: "object",
      required: ["hallazgos_principales"],
      properties: {
        participantes_analizados: { type: "string" },
        hallazgos_principales: {
          type: "array",
          items: {
            type: "object",
            required: ["descripcion"],
            properties: {
              descripcion: { type: "string" },
              valor: { type: "string" },
              intervalo_confianza: { type: ["string", "null"] },
              valor_p: { type: ["string", "null"] },
              pagina_referencia: { type: "number" }
            }
          }
        },
        hallazgos_secundarios: {
          oneOf: [{ type: "array", items: { type: "string" } }, { type: "string" }]
        },
        efectos_adversos: {
          oneOf: [{ type: "array", items: { type: "string" } }, { type: "string" }]
        }
      }
    },
    discusion: {
      type: "object",
      required: ["interpretacion"],
      properties: {
        interpretacion: { type: "string" },
        comparacion_literatura: { type: "string" },
        limitaciones: {
          oneOf: [{ type: "array", items: { type: "string" } }, { type: "string" }]
        },
        fortalezas: {
          oneOf: [{ type: "array", items: { type: "string" } }, { type: "string" }]
        },
        implicaciones_clinicas: { type: "string" },
        investigacion_futura: { type: "string" }
      }
    },
    puntos_clave: {
      type: "array",
      items: { type: "string" },
      maxItems: 5
    },
    advertencias: {
      type: "array",
      items: { type: "string" },
      minItems: 1
    },
    calidad_extraccion: {
      type: "object",
      required: ["score"],
      properties: {
        score: { type: "number", minimum: 0, maximum: 1 },
        secciones_encontradas: { type: "array", items: { type: "string" } },
        secciones_faltantes: { type: "array", items: { type: "string" } },
        notas: { type: "string" }
      }
    }
  }
};

/**
 * Valida una respuesta JSON contra el schema IMRyD
 *
 * @param {Object} response - Respuesta JSON parseada del LLM
 * @returns {Object} - { valid: boolean, errors: string[], isError?: boolean }
 */
export function validateIMRyDResponse(response) {
  const errors = [];

  if (!response || typeof response !== 'object') {
    return {
      valid: false,
      errors: ['Response is not a valid object']
    };
  }

  // Check for error response (which is valid)
  if (response.error) {
    return {
      valid: true,
      errors: [],
      isError: true
    };
  }

  // Check required sections
  const requiredSections = ['metadata', 'introduccion', 'metodos', 'resultados', 'discusion', 'puntos_clave', 'advertencias'];
  for (const section of requiredSections) {
    if (!response[section]) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  // Check metadata
  if (response.metadata && !response.metadata.titulo) {
    errors.push('Missing required field: metadata.titulo');
  }

  // Check for mandatory disclaimer
  if (response.advertencias && Array.isArray(response.advertencias)) {
    const hasDisclaimer = response.advertencias.some(a =>
      a.toLowerCase().includes('no constituye consejo médico') ||
      a.toLowerCase().includes('informativo')
    );
    if (!hasDisclaimer) {
      errors.push('Missing mandatory medical disclaimer in advertencias');
    }
  }

  // Check puntos_clave limit
  if (response.puntos_clave && response.puntos_clave.length > 5) {
    errors.push('puntos_clave exceeds maximum of 5 items');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================
// UTILIDADES Y EXPORTS
// ============================================

/**
 * Genera el prompt de resumen con el título insertado
 *
 * @param {string} title - Título del documento
 * @returns {string} - Prompt con título
 */
export const getSummaryPrompt = (title) =>
  SUMMARY_GENERATION_PROMPT.replace('{title}', title);

/**
 * Export default con todos los prompts y funciones
 */
export default {
  // Modo Markdown (default)
  PAGE_ANALYSIS_PROMPT,
  SUMMARY_GENERATION_PROMPT,
  getSummaryPrompt,

  // Modo JSON (USE_PROMPTS_V2=true)
  PAGE_ANALYSIS_PROMPT_V2,
  IMRYD_EXTRACTION_PROMPT,
  IMRYD_JSON_SCHEMA,
  validateIMRyDResponse
};
