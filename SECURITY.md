# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** open a public GitHub issue
2. Email security concerns to the project maintainers
3. Include a detailed description of the vulnerability
4. Allow reasonable time for a fix before public disclosure

## Security Measures

### Currently Implemented

- ✅ PDF MIME type validation
- ✅ File size limits (50MB maximum)
- ✅ Temporary file cleanup after processing
- ✅ Environment variable isolation for API keys
- ✅ CORS configuration
- ✅ `.env` excluded from version control

### Planned Improvements

- 🔲 Rate limiting (requests per IP)
- 🔲 PDF magic byte validation
- 🔲 Maximum page count limits
- 🔲 Parsing timeout protection
- 🔲 Sandboxed PDF parsing
- 🔲 Content Security Policy headers
- 🔲 CSRF protection

## Handling Sensitive Data

### Document Processing

- PDFs are stored temporarily in `/server/uploads/` during processing
- Files are automatically deleted after processing completes or fails
- Document content is sent to OpenRouter API for AI analysis
- No persistent storage of document content on the server

### Logging

- Production logs should NOT contain document text
- API keys are never logged
- SSE events may contain preview text (configurable)

### Third-Party Services

- **OpenRouter API**: Document text is sent for AI processing
- Review OpenRouter's privacy policy for data handling details
- Consider "no-store" mode for sensitive documents (planned feature)

## PDF Security Considerations

PDFs can be attack vectors. This application implements:

1. **Type Validation**: Checks MIME type before processing
2. **Size Limits**: Rejects files over 50MB
3. **Cleanup**: Removes uploaded files after processing

### Known Risks

- **PDF parsing exploits**: The `pdf-parse` library processes PDFs in the main process
- **Resource exhaustion**: Large or complex PDFs may consume significant memory
- **Prompt injection**: Malicious PDF content could attempt to manipulate AI behavior

## Best Practices for Deployment

1. **Never commit `.env`** files with real API keys
2. **Use HTTPS** in production
3. **Set restrictive CORS** origins
4. **Enable rate limiting** to prevent abuse
5. **Monitor** API usage and costs
6. **Rotate API keys** periodically

## Environment Variables

Ensure these are properly secured:

| Variable | Sensitivity | Notes |
|----------|-------------|-------|
| `OPENAI_API_KEY` | **HIGH** | Never log or expose |
| `PORT` | Low | Internal configuration |
| `CLIENT_URL` | Low | Used for CORS |
| `MODEL` | Low | AI model selection |

## Disclaimer

This application generates AI-based summaries of medical articles. These summaries:

- Are **informational only** and do not constitute medical advice
- May contain errors or omissions
- Should always be verified against the original document
- Should not be used for clinical decision-making without expert review

---

Last updated: 2026-01-17
