# Arquitectura

## Visión General

Medical Article Summarizer es una aplicación MERN-stack que procesa PDFs médicos y genera resúmenes estructurados en formato IMRyD usando IA.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Cliente (React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │FileUploader │  │TerminalLog │  │    SummaryViewer       │  │
│  │   (drag)    │  │   (SSE)    │  │ (Markdown + Árbol)     │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬───────────┘  │
│         │                │                      │              │
│         └────────────────┼──────────────────────┘              │
│                          │                                      │
│           ┌──────────────▼──────────────┐                      │
│           │     useProcessing Hook       │                      │
│           │   (manejo de stream SSE)     │                      │
│           └──────────────┬──────────────┘                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTP POST + SSE
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Servidor (Express)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     index.js                              │   │
│  │  - CORS, parsing JSON                                     │   │
│  │  - Servir archivos estáticos (producción)                 │   │
│  │  - Manejo de errores                                      │   │
│  └────────────────────────────┬─────────────────────────────┘   │
│                               │                                  │
│  ┌────────────────────────────▼─────────────────────────────┐   │
│  │              pdfController.js                             │   │
│  │  - Carga de archivos con Multer                           │   │
│  │  - Configuración de stream SSE                            │   │
│  │  - Orquestación del pipeline                              │   │
│  └─────┬─────────────────┬────────────────┬─────────────────┘   │
│        │                 │                │                      │
│        ▼                 ▼                ▼                      │
│  ┌───────────┐    ┌────────────┐   ┌─────────────────┐          │
│  │pdfService │    │ aiService  │   │structureService│          │
│  │           │    │            │   │                │          │
│  │- Extraer  │    │- Analizar  │   │- Agrupar       │          │
│  │  texto    │    │  páginas   │   │  páginas       │          │
│  │- Segmentar│    │- Generar   │   │- Construir     │          │
│  │  páginas  │    │  resumen   │   │  árbol         │          │
│  └───────────┘    └─────┬──────┘   └────────────────┘          │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │ HTTPS
                          ▼
                 ┌─────────────────┐
                 │  API de IA      │
                 │  (OpenRouter/   │
                 │   Ollama)       │
                 └─────────────────┘
```

## Flujo de Datos

### 1. Carga de PDF
```
Usuario arrastra PDF → FileUploader valida (tipo, tamaño) → 
FormData POST a /api/process → Multer guarda en /uploads/
```

### 2. Pipeline de Procesamiento
```
pdfController recibe el archivo
    │
    ├─1─► pdfService.extractTextFromPDF()
    │     └── librería pdf-parse → texto + array de páginas
    │
    ├─2─► pdfService.detectStructure()
    │     └── Patrones regex para encabezados de Parte/Capítulo
    │
    ├─3─► POR CADA página:
    │     └── aiService.analyzePage() → API de IA
    │
    ├─4─► aiService.generateSummary()
    │     └── Combina análisis → resumen IMRyD
    │
    └─5─► structureService.buildFileTree()
          └── Organiza para consumo de la UI
```

### 3. Eventos SSE
```javascript
// Tipos de eventos enviados al cliente
{ type: 'log', text: '...', color: '...' }
{ type: 'progress', percent: 45 }
{ type: 'complete', result: {...} }
{ type: 'error', message: '...' }
```

## Estructura de Directorios

```
medical_article_summarizer/
├── .env.example          # Plantilla de entorno
├── .gitignore
├── package.json          # Scripts raíz (dev, build)
├── README.md
├── SECURITY.md           # Documentación de seguridad
│
├── client/               # Frontend React (Vite)
│   ├── src/
│   │   ├── App.jsx       # Componente principal
│   │   ├── components/
│   │   │   ├── FileUploader.jsx
│   │   │   ├── TerminalLog.jsx
│   │   │   └── SummaryViewer.jsx
│   │   └── hooks/
│   │       └── useProcessing.js  # Hook cliente SSE
│   └── vite.config.js
│
└── server/               # Backend Express
    ├── index.js          # Entrada del servidor, middleware
    ├── config/
    │   └── env.js        # Cargador de dotenv
    ├── controllers/
    │   └── pdfController.js  # Orquestador principal
    ├── services/
    │   ├── pdfService.js     # Extracción de PDF
    │   ├── aiService.js      # Integración con LLM
    │   └── structureService.js
    ├── middleware/
    │   └── rateLimiter.js    # Rate limiting
    ├── utils/
    │   ├── prompts.js        # Prompts del sistema
    │   ├── prompts.v2.js     # Prompts anti-alucinación
    │   └── pdfValidator.js   # Validación de seguridad
    ├── tests/
    │   └── pdfService.test.js
    └── uploads/          # Almacenamiento temporal de PDFs
```

## Decisiones de Diseño Clave

### 1. SSE en lugar de WebSockets
- **Por qué**: Más simple, unidireccional, soporte nativo del navegador
- **Compromiso**: Sin comunicación bidireccional (no es necesaria)

### 2. Librería pdf-parse
- **Por qué**: Cero dependencias, JavaScript puro
- **Limitación**: Sin análisis de layout (columnas, tablas)
- **Futuro**: Considerar pdfplumber o wrapper de PyMuPDF

### 3. Gateway OpenRouter
- **Por qué**: API única para múltiples proveedores de LLM
- **Beneficio**: Cambio fácil de modelo via variable de entorno
- **Riesgo**: Dependencia de proveedor (mitigado con opción de modelo local)

### 4. Procesamiento Secuencial de Páginas
- **Por qué**: Manejo de errores más simple, progreso predecible
- **Limitación**: Lento para documentos grandes
- **Futuro**: Procesamiento por lotes o workers paralelos

### 5. Almacenamiento Temporal de Archivos
- **Por qué**: Evita problemas de memoria con PDFs grandes
- **Seguridad**: Archivos eliminados después del procesamiento
- **Futuro**: Considerar streaming para eficiencia de memoria

## Configuración

### Variables de Entorno
| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `CHUTES_API_KEY` | Sí* | API key del proveedor de IA |
| `MODEL` | No | Modelo LLM (default: tier gratuito) |
| `PORT` | No | Puerto del servidor (default: 3001) |
| `CLIENT_URL` | No | Origen CORS (default: localhost:5173) |
| `USE_OLLAMA` | No | Usar Ollama local (default: false) |

*No requerida si USE_OLLAMA=true

### Límites
| Recurso | Límite | Configurable |
|---------|--------|--------------|
| Tamaño de archivo | 50MB | pdfController.js |
| Páginas | 100 | Variable MAX_PAGES |
| Rate limit | 5/min | rateLimiter.js |

## Consideraciones de Seguridad

Ver [SECURITY.md](./SECURITY.md) para detalles completos.

### Implementadas
- Validación de tipo MIME
- Limpieza de archivos post-procesamiento
- Aislamiento de variables de entorno
- Rate limiting
- Validación de magic bytes

### Necesarias
- Protección contra prompt injection
- Sandbox para parsing de PDF

## Mejoras Futuras

### Corto Plazo
- [ ] Validación de esquema JSON para salida del LLM
- [ ] Mejores mensajes de error

### Mediano Plazo
- [ ] Mejor parsing de PDF (tablas, columnas)
- [ ] Capa de caché (Redis)
- [ ] Salida JSON estructurada del LLM
- [ ] Funcionalidad de exportación (DOCX)

### Largo Plazo
- [ ] Cola de trabajos para procesamiento
- [ ] Autenticación de usuarios
- [ ] Historial de documentos
