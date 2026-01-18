# Architecture

## Overview

Medical Article Summarizer is a MERN-stack application that processes medical PDFs and generates structured IMRyD summaries using AI.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │FileUploader │  │TerminalLog │  │    SummaryViewer       │  │
│  │   (drag)    │  │   (SSE)    │  │ (Markdown + Tree)      │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬───────────┘  │
│         │                │                      │              │
│         └────────────────┼──────────────────────┘              │
│                          │                                      │
│           ┌──────────────▼──────────────┐                      │
│           │     useProcessing Hook       │                      │
│           │   (SSE stream handling)      │                      │
│           └──────────────┬──────────────┘                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTP POST + SSE
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Server (Express)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     index.js                              │   │
│  │  - CORS, JSON parsing                                     │   │
│  │  - Static file serving (production)                       │   │
│  │  - Error handling                                         │   │
│  └────────────────────────────┬─────────────────────────────┘   │
│                               │                                  │
│  ┌────────────────────────────▼─────────────────────────────┐   │
│  │              pdfController.js                             │   │
│  │  - Multer file upload                                     │   │
│  │  - SSE stream setup                                       │   │
│  │  - Pipeline orchestration                                 │   │
│  └─────┬─────────────────┬────────────────┬─────────────────┘   │
│        │                 │                │                      │
│        ▼                 ▼                ▼                      │
│  ┌───────────┐    ┌────────────┐   ┌─────────────────┐          │
│  │pdfService │    │ aiService  │   │structureService│          │
│  │           │    │            │   │                │          │
│  │- Extract  │    │- Analyze   │   │- Group pages   │          │
│  │  text     │    │  pages     │   │- Build tree    │          │
│  │- Segment  │    │- Generate  │   │                │          │
│  │  pages    │    │  summary   │   │                │          │
│  └───────────┘    └─────┬──────┘   └────────────────┘          │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │ HTTPS
                          ▼
                 ┌─────────────────┐
                 │  OpenRouter API │
                 │  (LLM Gateway)  │
                 └─────────────────┘
```

## Data Flow

### 1. PDF Upload
```
User drops PDF → FileUploader validates (type, size) → 
FormData POST to /api/process → Multer saves to /uploads/
```

### 2. Processing Pipeline
```
pdfController receives file
    │
    ├─1─► pdfService.extractTextFromPDF()
    │     └── pdf-parse library → text + pages array
    │
    ├─2─► pdfService.detectStructure()
    │     └── Regex patterns for Part/Chapter headers
    │
    ├─3─► FOR EACH page:
    │     └── aiService.analyzePage() → OpenRouter API
    │
    ├─4─► aiService.generateSummary()
    │     └── Combines analyses → IMRyD summary
    │
    └─5─► structureService.buildFileTree()
          └── Organizes for UI consumption
```

### 3. SSE Events
```javascript
// Event types sent to client
{ type: 'log', text: '...', color: '...' }
{ type: 'progress', percent: 45 }
{ type: 'complete', result: {...} }
{ type: 'error', message: '...' }
```

## Directory Structure

```
medical_article_summarizer/
├── .env.example          # Environment template
├── .gitignore
├── package.json          # Root scripts (dev, build)
├── README.md
├── SECURITY.md           # Security documentation
│
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx       # Main component
│   │   ├── components/
│   │   │   ├── FileUploader.jsx
│   │   │   ├── TerminalLog.jsx
│   │   │   └── SummaryViewer.jsx
│   │   └── hooks/
│   │       └── useProcessing.js  # SSE client hook
│   └── vite.config.js
│
└── server/               # Express backend
    ├── index.js          # Server entry, middleware
    ├── config/
    │   └── env.js        # dotenv loader
    ├── controllers/
    │   └── pdfController.js  # Main orchestrator
    ├── services/
    │   ├── pdfService.js     # PDF extraction
    │   ├── aiService.js      # LLM integration
    │   └── structureService.js
    ├── middleware/
    │   └── rateLimiter.js    # Rate limiting (new)
    ├── utils/
    │   ├── prompts.js        # System prompts
    │   ├── prompts.v2.js     # Anti-hallucination prompts
    │   └── pdfValidator.js   # Security validation (new)
    ├── tests/
    │   └── pdfService.test.js
    └── uploads/          # Temporary PDF storage
```

## Key Design Decisions

### 1. SSE over WebSockets
- **Why**: Simpler, unidirectional, native browser support
- **Trade-off**: No bidirectional communication (not needed)

### 2. pdf-parse Library
- **Why**: Zero dependencies, pure JavaScript
- **Limitation**: No layout analysis (columns, tables)
- **Future**: Consider pdfplumber or PyMuPDF wrapper

### 3. OpenRouter Gateway
- **Why**: Single API for multiple LLM providers
- **Benefit**: Easy model switching via environment variable
- **Risk**: Vendor dependency (mitigate with local model option)

### 4. Sequential Page Processing
- **Why**: Simpler error handling, predictable progress
- **Limitation**: Slow for large documents
- **Future**: Batch processing or parallel workers

### 5. Temporary File Storage
- **Why**: Avoids memory issues with large PDFs
- **Security**: Files deleted after processing
- **Future**: Consider streaming for memory efficiency

## Configuration

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenRouter API key |
| `MODEL` | No | LLM model (default: free tier) |
| `PORT` | No | Server port (default: 3001) |
| `CLIENT_URL` | No | CORS origin (default: localhost:5173) |

### Limits
| Resource | Limit | Configurable |
|----------|-------|--------------|
| File size | 50MB | pdfController.js L45 |
| Pages | None currently | Recommended: add |
| Rate limit | None currently | Implemented in rateLimiter.js |

## Security Considerations

See [SECURITY.md](./SECURITY.md) for full details.

### Current
- MIME type validation
- File cleanup post-processing
- Environment variable isolation

### Needed
- Magic byte validation
- Page count limits
- Rate limiting activation
- Prompt injection protection

## Future Improvements

### Short-term
- [ ] Activate rate limiting in index.js
- [ ] Add page count validation
- [ ] Implement JSON schema validation for LLM output
- [ ] Add medical disclaimer to UI

### Medium-term
- [ ] Better PDF parsing (tables, columns)
- [ ] Caching layer (Redis)
- [ ] Structured JSON output from LLM
- [ ] Export functionality (DOCX, PDF)

### Long-term
- [ ] Job queue for processing
- [ ] Local LLM option (Ollama)
- [ ] User authentication
- [ ] Document history
