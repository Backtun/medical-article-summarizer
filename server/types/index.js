/**
 * TypeScript Type Definitions for Medical Summarizer
 *
 * These types can be used with JSDoc for type checking without full TypeScript migration.
 * Usage: Add @ts-check at the top of JS files to enable type checking.
 */

// ===========================================
// PDF Processing Types
// ===========================================

/**
 * @typedef {Object} PageData
 * @property {number} pageNumber - Page number (1-indexed)
 * @property {string} text - Extracted text content
 * @property {string} [analysis] - AI analysis of the page
 */

/**
 * @typedef {Object} PDFMetadata
 * @property {string} [Title] - Document title
 * @property {string} [Author] - Document author
 * @property {string} [Subject] - Document subject
 * @property {string} [Creator] - Creating application
 * @property {string} [Producer] - PDF producer
 * @property {string} [CreationDate] - Creation date
 * @property {string} [ModDate] - Modification date
 */

/**
 * @typedef {Object} PDFData
 * @property {string} text - Full document text
 * @property {number} numpages - Total page count
 * @property {PDFMetadata} [metadata] - Document metadata
 * @property {PageData[]} [pages] - Individual page data
 */

// ===========================================
// IMRyD Structure Types
// ===========================================

/**
 * @typedef {Object} IMRyDSection
 * @property {number} startPage - Page where section starts
 * @property {string} title - Detected section title
 * @property {boolean} detected - Whether section was found
 */

/**
 * @typedef {Object} IMRyDStructure
 * @property {IMRyDSection|null} abstract
 * @property {IMRyDSection|null} introduction
 * @property {IMRyDSection|null} methods
 * @property {IMRyDSection|null} results
 * @property {IMRyDSection|null} discussion
 * @property {IMRyDSection|null} references
 */

/**
 * @typedef {Object} PartStructure
 * @property {string} id - Unique identifier
 * @property {string} number - Part number
 * @property {string} title - Part title
 * @property {number} startPage - Starting page
 * @property {ChapterStructure[]} chapters - Child chapters
 */

/**
 * @typedef {Object} ChapterStructure
 * @property {string} id - Unique identifier
 * @property {string} number - Chapter number
 * @property {string} title - Chapter title
 * @property {number} startPage - Starting page
 * @property {Object[]} sections - Child sections
 */

/**
 * @typedef {Object} DocumentStructure
 * @property {PartStructure[]} parts - Document parts
 * @property {ChapterStructure[]} chapters - All chapters
 * @property {Object[]} sections - All sections
 * @property {IMRyDStructure} imryd - IMRyD section detection
 * @property {boolean} isIMRyDFormat - Whether document follows IMRyD format
 */

// ===========================================
// AI Service Types
// ===========================================

/**
 * @typedef {Object} TokenUsage
 * @property {number} prompt - Prompt tokens used
 * @property {number} completion - Completion tokens used
 * @property {number} total - Total tokens used
 */

/**
 * @typedef {Object} IMRyDMetadata
 * @property {string} titulo - Document title
 * @property {string|string[]} autores - Authors
 * @property {string} fecha_publicacion - Publication date
 * @property {string} tipo_estudio - Study type
 * @property {string} [doi] - DOI if available
 */

/**
 * @typedef {Object} IMRyDIntroduccion
 * @property {string} contexto - Background context
 * @property {string} objetivo_principal - Main objective
 * @property {string[]} [objetivos_secundarios] - Secondary objectives
 */

/**
 * @typedef {Object} IMRyDMetodos
 * @property {string} diseno - Study design
 * @property {string} poblacion - Study population
 * @property {string} tamano_muestra - Sample size
 * @property {string[]} [intervenciones] - Interventions
 * @property {string[]} [variables_medidas] - Measured variables
 */

/**
 * @typedef {Object} IMRyDHallazgo
 * @property {string} descripcion - Finding description
 * @property {string} [valor] - Numerical value
 * @property {string} [intervalo_confianza] - Confidence interval
 * @property {string} [valor_p] - P-value
 * @property {string} [pagina_referencia] - Source page reference
 */

/**
 * @typedef {Object} IMRyDResultados
 * @property {IMRyDHallazgo[]} hallazgos_principales - Main findings
 * @property {Object} [estadisticas] - Statistical results
 */

/**
 * @typedef {Object} IMRyDDiscusion
 * @property {string} interpretacion - Results interpretation
 * @property {string|string[]} limitaciones - Study limitations
 * @property {string} [implicaciones_clinicas] - Clinical implications
 */

/**
 * @typedef {Object} IMRyDCalidad
 * @property {number} score - Quality score (0-1)
 * @property {string} [notas] - Quality notes
 */

/**
 * @typedef {Object} IMRyDResponse
 * @property {IMRyDMetadata} metadata - Document metadata
 * @property {IMRyDIntroduccion} introduccion - Introduction section
 * @property {IMRyDMetodos} metodos - Methods section
 * @property {IMRyDResultados} resultados - Results section
 * @property {IMRyDDiscusion} discusion - Discussion section
 * @property {string[]} puntos_clave - Key points
 * @property {string[]} advertencias - Warnings/disclaimers
 * @property {IMRyDCalidad} calidad_extraccion - Extraction quality
 */

// ===========================================
// Processing Result Types
// ===========================================

/**
 * @typedef {Object} AnalyzedPage
 * @property {number} pageNumber - Page number
 * @property {string} analysis - AI analysis
 * @property {string} text - Original text preview
 */

/**
 * @typedef {Object} FileTreeNode
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string} type - Node type (folder, page, summary, metadata)
 * @property {string} [content] - Markdown content
 * @property {FileTreeNode[]} [children] - Child nodes
 */

/**
 * @typedef {Object} ProcessingResult
 * @property {string} title - Document title
 * @property {string} fileName - Original filename
 * @property {number} totalPages - Total pages processed
 * @property {DocumentStructure} structure - Document structure
 * @property {AnalyzedPage[]} pages - Analyzed pages
 * @property {string} summary - Generated summary (Markdown)
 * @property {Object} groupedContent - Content grouped by structure
 * @property {PDFMetadata} [metadata] - PDF metadata
 * @property {string} processedAt - ISO timestamp
 * @property {string} [documentHash] - SHA256 hash of document
 * @property {string} disclaimer - Medical disclaimer
 * @property {FileTreeNode[]} fileTree - Navigation tree for UI
 */

// ===========================================
// API Types
// ===========================================

/**
 * @typedef {Object} SSELogEvent
 * @property {'log'} type - Event type
 * @property {string} text - Log message
 * @property {string} color - Display color
 * @property {string} timestamp - ISO timestamp
 */

/**
 * @typedef {Object} SSEProgressEvent
 * @property {'progress'} type - Event type
 * @property {number} percent - Progress percentage (0-100)
 */

/**
 * @typedef {Object} SSECompleteEvent
 * @property {'complete'} type - Event type
 * @property {ProcessingResult} result - Processing result
 */

/**
 * @typedef {Object} SSEErrorEvent
 * @property {'error'} type - Event type
 * @property {string} message - Error message
 */

/**
 * @typedef {SSELogEvent|SSEProgressEvent|SSECompleteEvent|SSEErrorEvent} SSEEvent
 */

// ===========================================
// Rate Limiter Types
// ===========================================

/**
 * @typedef {Object} RateLimitOptions
 * @property {number} [windowMs] - Time window in milliseconds
 * @property {number} [max] - Maximum requests per window
 * @property {string} [message] - Error message when limited
 * @property {number} [statusCode] - HTTP status code when limited
 * @property {boolean} [skipSuccessfulRequests] - Don't count successful requests
 * @property {boolean} [skipFailedRequests] - Don't count failed requests
 */

/**
 * @typedef {Object} RateLimitResult
 * @property {boolean} allowed - Whether request is allowed
 * @property {number} remaining - Remaining requests in window
 * @property {number} [retryAfter] - Seconds until window resets
 */

// ===========================================
// Export Types
// ===========================================

/**
 * @typedef {Object} ExportResult
 * @property {string} content - File content
 * @property {string} filename - Suggested filename
 * @property {string} mimeType - MIME type
 */

// Export empty object to make this a module
export {};