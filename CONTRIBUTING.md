# Contributing to Medical Article Summarizer

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd medical-article-summarizer
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your OpenRouter API key
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

## Code Style

We use ESLint and Prettier for code formatting. Before committing:

```bash
# Check for linting issues
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

### Style Guidelines

- Use **single quotes** for strings
- Use **2 spaces** for indentation
- Use **semicolons** at end of statements
- Use **arrow functions** where appropriate
- Add **JSDoc comments** for public functions

## Git Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, descriptive commit messages
   - Keep commits focused and atomic
   - Reference issue numbers when applicable

3. **Run tests before committing**
   ```bash
   npm run test --prefix server
   ```

4. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Pull Request Guidelines

- Provide a clear description of the changes
- Include screenshots for UI changes
- Ensure all tests pass
- Update documentation if needed
- Link to related issues

## Security

- **Never commit API keys** or secrets
- Use `.env` for sensitive configuration
- Report security issues privately (see SECURITY.md)

## Testing

- Add tests for new features
- Maintain test coverage
- Use descriptive test names

```bash
# Run server tests
npm run test --prefix server

# Run with coverage (when configured)
npm run test:coverage --prefix server
```

## Documentation

- Update README.md for user-facing changes
- Update ARCHITECTURE.md for structural changes
- Add JSDoc comments for new functions
- Keep comments up to date

## Need Help?

- Open an issue for bugs or feature requests
- Ask questions in issue discussions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
