# Medical Article Summarizer

[![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)

Aplicación MERN Stack para resumir artículos médicos usando inteligencia artificial. Permite subir documentos PDF y obtener resúmenes estructurados en formato IMRyD (Introducción, Métodos, Resultados y Discusión).

> ⚠️ **Aviso**: Este servicio es informativo y no constituye consejo médico. Los resúmenes son generados por IA y deben verificarse con el documento original.

## Capturas de Pantalla

<!-- Agrega capturas de pantalla de tu aplicación aquí -->
<p align="center">
  <em>Próximamente: capturas de pantalla de la interfaz</em>
</p>

## Características

- 📄 **Procesamiento de PDF**: Carga y extracción inteligente de texto de documentos PDF médicos
- 🤖 **IA Avanzada**: Integración con OpenRouter o Ollama (local) para generación de resúmenes
- 🎯 **Formato IMRyD**: Resúmenes estructurados siguiendo el estándar científico
- 📊 **Visualización en Árbol**: Navegación jerárquica del contenido del documento
- ⚡ **Tiempo Real**: Progreso de procesamiento mediante Server-Sent Events (SSE)
- 📤 **Exportación Múltiple**: Descarga en Markdown, JSON y HTML
- 🔒 **Seguridad**: Validación de archivos, límites de tamaño y limpieza automática
- 🦙 **Modo Local**: Soporte para Ollama como alternativa sin conexión a internet

## Tecnologías

| Área | Tecnologías |
|------|-------------|
| **Frontend** | React 18, Vite, React Markdown, CSS Modules |
| **Backend** | Node.js, Express, Multer |
| **IA** | OpenRouter API, Ollama (opcional) |
| **Procesamiento** | pdf-parse |
| **Testing** | Jest |

## Instalación

### Requisitos Previos

- Node.js v18 o superior
- npm o yarn
- Cuenta en [OpenRouter](https://openrouter.ai/) para obtener API key (o [Ollama](https://ollama.ai/) instalado localmente)

### Pasos de Instalación

1. **Clonar el repositorio**

```bash
git clone https://github.com/tu-usuario/medical-article-summarizer.git
cd medical-article-summarizer
```

2. **Instalar dependencias**

```bash
npm run install:all
```

3. **Configurar variables de entorno**

```bash
cp .env.example .env
```

Edita el archivo `.env` con tu configuración:

```env
# API de IA (OpenRouter o Chutes)
CHUTES_API_KEY=tu-api-key-aqui

# O usa Ollama localmente
USE_OLLAMA=true
OLLAMA_MODEL=llama3.2
```

4. **Iniciar la aplicación**

```bash
npm run dev
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## Uso

1. Abre la aplicación en tu navegador
2. Arrastra y suelta un documento PDF de un artículo médico (o haz clic para seleccionar)
3. Observa el progreso en tiempo real en el terminal
4. Explora el resumen estructurado con navegación por secciones
5. Exporta el resultado en el formato que prefieras

## Estructura del Proyecto

```
medical-article-summarizer/
├── client/                 # Frontend React (Vite)
│   ├── src/
│   │   ├── components/     # Componentes de UI
│   │   ├── hooks/          # Custom hooks (SSE)
│   │   └── App.jsx         # Componente principal
│   └── package.json
├── server/                 # Backend Node.js
│   ├── controllers/        # Controladores de rutas
│   ├── services/           # Lógica de negocio (AI, PDF, etc.)
│   ├── middleware/         # Rate limiting, autenticación
│   ├── utils/              # Utilidades y prompts
│   └── tests/              # Tests unitarios
├── docs/                   # Documentación adicional
├── .env.example            # Plantilla de configuración
└── package.json            # Scripts principales
```

## Variables de Entorno

| Variable | Requerida | Descripción | Ejemplo |
|----------|-----------|-------------|---------|
| `CHUTES_API_KEY` | Sí* | API key de Chutes AI | `cpk_...` |
| `MODEL` | No | Modelo de IA a usar | `zai-org/GLM-4.7-TEE` |
| `USE_OLLAMA` | No | Usar Ollama en lugar de API | `true` |
| `OLLAMA_MODEL` | No | Modelo de Ollama | `llama3.2` |
| `PORT` | No | Puerto del servidor | `3001` |
| `MAX_PAGES` | No | Límite de páginas | `100` |
| `CLIENT_URL` | No | URL para CORS | `http://localhost:5173` |

*No requerida si `USE_OLLAMA=true`

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run install:all` | Instala todas las dependencias |
| `npm run dev` | Inicia en modo desarrollo |
| `npm run build` | Compila el frontend para producción |
| `npm start` | Inicia en modo producción |
| `npm run lint` | Ejecuta el linter |
| `npm run format` | Formatea el código |
| `npm run test --prefix server` | Ejecuta tests del backend |

## Despliegue

### Producción (Servidor Único)

```bash
npm run build
NODE_ENV=production npm start
```

Express servirá automáticamente el frontend compilado desde `client/dist`.

### Producción (Separado)

Si despliegas frontend y backend por separado:

1. Configura `VITE_API_URL` en el frontend apuntando al backend
2. Configura `CLIENT_URL` en el backend para CORS

## Hoja de Ruta

### Corto Plazo
- [ ] Mejorar parsing de tablas y columnas en PDFs
- [ ] Añadir validación de esquema JSON para respuestas de IA
- [ ] Implementar caché con Redis

### Mediano Plazo
- [ ] Cola de trabajos para procesamiento en segundo plano
- [ ] Exportación a DOCX
- [ ] Historial de documentos procesados

### Largo Plazo
- [ ] Autenticación de usuarios
- [ ] API pública con documentación
- [ ] Soporte para más formatos (EPUB, HTML)

## Seguridad

⚠️ **IMPORTANTE**:
- **NUNCA** subas el archivo `.env` con tus API keys
- **NUNCA** subas archivos PDF de la carpeta `server/uploads/`
- No proceses documentos con información médica sensible (PHI) sin autorización

Consulta [SECURITY.md](SECURITY.md) para más detalles sobre las medidas de seguridad implementadas.

## Contribuir

¡Las contribuciones son bienvenidas! Por favor, lee [CONTRIBUTING.md](CONTRIBUTING.md) para conocer las guías de contribución.

1. Haz fork del proyecto
2. Crea tu rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Haz commit de tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Haz push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Problemas Comunes

### Error de API Key
Asegúrate de tener una API key válida en tu archivo `.env`. Verifica que no tenga espacios extra.

### Error de CORS
Verifica que `CLIENT_URL` coincida exactamente con la URL de tu frontend (incluyendo el puerto).

### PDFs No Procesados
- Verifica que el archivo sea un PDF válido (no corrupto)
- El límite por defecto es 50MB y 100 páginas
- Algunos PDFs escaneados pueden no tener texto extraíble

### Ollama No Conecta
Asegúrate de que Ollama esté ejecutándose: `ollama serve`

## Documentación Adicional

- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitectura técnica del sistema
- [SECURITY.md](SECURITY.md) - Política de seguridad
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guía de contribución
- [docs/threat_model.md](docs/threat_model.md) - Modelo de amenazas

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

## Agradecimientos

- [OpenRouter](https://openrouter.ai/) por proporcionar acceso a múltiples modelos de IA
- [Ollama](https://ollama.ai/) por permitir ejecución local de modelos
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) por la extracción de texto de PDFs
- La comunidad de código abierto por las herramientas y librerías utilizadas

---

<p align="center">
  Desarrollado con ❤️ para la comunidad médica hispanohablante
</p>
