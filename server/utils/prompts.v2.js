/**
 * System Prompts v2.0 - Anti-Hallucination Edition
 *
 * These prompts are designed to:
 * 1. Prevent AI from inventing data not present in the source
 * 2. Require citations for all claims
 * 3. Return structured JSON for validation
 * 4. Include mandatory medical disclaimers
 */

/**
 * IMRYD_EXTRACTION_PROMPT
 *
 * Main prompt for extracting structured IMRyD content from medical articles.
 * Enforces strict evidence-based output with page references.
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

/**
 * PAGE_ANALYSIS_PROMPT_V2
 *
 * Prompt for analyzing individual pages with evidence tracking.
 */
export const PAGE_ANALYSIS_PROMPT_V2 = `Analiza esta página de un artículo médico. Extrae SOLO la información presente en el texto.

REGLAS:
1. NO inventes datos que no estén en el texto
2. Si detectas una sección IMRyD (Introducción, Métodos, Resultados, Discusión), indícalo
3. Extrae números, estadísticas y datos clave EXACTAMENTE como aparecen
4. Marca cualquier incertidumbre

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
 * JSON Schema for validation
 */
export const IMRYD_JSON_SCHEMA = {
  type: "object",
  required: ["metadata", "introduccion", "metodos", "resultados", "discusion", "puntos_clave", "advertencias", "calidad_extraccion"],
  properties: {
    metadata: {
      type: "object",
      required: ["titulo"],
      properties: {
        titulo: {
          type: "string",
          minLength: 1
        },
        autores: {
          oneOf: [{
              type: "array",
              items: {
                type: "string"
              }
            },
            {
              type: "string",
              const: "No especificado en el documento"
            }
          ]
        },
        fecha_publicacion: {
          type: "string"
        },
        revista: {
          type: "string"
        },
        doi: {
          type: "string"
        },
        tipo_estudio: {
          type: "string"
        }
      }
    },
    introduccion: {
      type: "object",
      required: ["contexto", "objetivo_principal"],
      properties: {
        contexto: {
          type: "string"
        },
        objetivo_principal: {
          type: "string"
        },
        hipotesis: {
          type: "string"
        }
      }
    },
    metodos: {
      type: "object",
      required: ["diseno"],
      properties: {
        diseno: {
          type: "string"
        },
        poblacion: {
          type: "string"
        },
        tamano_muestra: {
          type: "string"
        },
        criterios_inclusion: {
          oneOf: [{
              type: "array",
              items: {
                type: "string"
              }
            },
            {
              type: "string"
            }
          ]
        },
        criterios_exclusion: {
          oneOf: [{
              type: "array",
              items: {
                type: "string"
              }
            },
            {
              type: "string"
            }
          ]
        },
        intervenciones: {
          oneOf: [{
              type: "array",
              items: {
                type: "string"
              }
            },
            {
              type: "string"
            }
          ]
        },
        grupo_control: {
          type: "string"
        },
        outcomes_primarios: {
          oneOf: [{
              type: "array",
              items: {
                type: "string"
              }
            },
            {
              type: "string"
            }
          ]
        },
        outcomes_secundarios: {
          oneOf: [{
              type: "array",
              items: {
                type: "string"
              }
            },
            {
              type: "string"
            }
          ]
        },
        seguimiento: {
          type: "string"
        },
        analisis_estadistico: {
          type: "string"
        }
      }
    },
    resultados: {
      type: "object",
      required: ["hallazgos_principales"],
      properties: {
        participantes_analizados: {
          type: "string"
        },
        hallazgos_principales: {
          type: "array",
          items: {
            type: "object",
            required: ["descripcion"],
            properties: {
              descripcion: {
                type: "string"
              },
              valor: {
                type: "string"
              },
              intervalo_confianza: {
                type: ["string", "null"]
              },
              valor_p: {
                type: ["string", "null"]
              },
              pagina_referencia: {
                type: "number"
              }
            }
          }
        },
        hallazgos_secundarios: {
          oneOf: [{
              type: "array",
              items: {
                type: "string"
              }
            },
            {
              type: "string"
            }
          ]
        },
        efectos_adversos: {
          oneOf: [{
              type: "array",
              items: {
                type: "string"
              }
            },
            {
              type: "string"
            }
          ]
        }
      }
    },
    discusion: {
      type: "object",
      required: ["interpretacion"],
      properties: {
        interpretacion: {
          type: "string"
        },
        comparacion_literatura: {
          type: "string"
        },
        limitaciones: {
          oneOf: [{
              type: "array",
              items: {
                type: "string"
              }
            },
            {
              type: "string"
            }
          ]
        },
        fortalezas: {
          oneOf: [{
              type: "array",
              items: {
                type: "string"
              }
            },
            {
              type: "string"
            }
          ]
        },
        implicaciones_clinicas: {
          type: "string"
        },
        investigacion_futura: {
          type: "string"
        }
      }
    },
    puntos_clave: {
      type: "array",
      items: {
        type: "string"
      },
      maxItems: 5
    },
    advertencias: {
      type: "array",
      items: {
        type: "string"
      },
      minItems: 1
    },
    calidad_extraccion: {
      type: "object",
      required: ["score"],
      properties: {
        score: {
          type: "number",
          minimum: 0,
          maximum: 1
        },
        secciones_encontradas: {
          type: "array",
          items: {
            type: "string"
          }
        },
        secciones_faltantes: {
          type: "array",
          items: {
            type: "string"
          }
        },
        notas: {
          type: "string"
        }
      }
    }
  }
};

/**
 * Validates a JSON response against the schema
 * @param {Object} response - Parsed JSON response from LLM
 * @returns {Object} - { valid: boolean, errors: string[] }
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

export default {
  IMRYD_EXTRACTION_PROMPT,
  PAGE_ANALYSIS_PROMPT_V2,
  IMRYD_JSON_SCHEMA,
  validateIMRyDResponse
};