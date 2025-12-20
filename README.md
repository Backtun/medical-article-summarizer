# Medical Article Summarizer

Aplicación MERN Stack para resumir artículos médicos usando inteligencia artificial. Permite subir documentos PDF y obtener resúmenes estructurados con análisis inteligente.

## Características

- 📄 **Procesamiento de PDF**: Carga y extracción de texto de documentos PDF
- 🤖 **IA Inteligente**: Integración con OpenRouter para generación de resúmenes
- 🎯 **Resúmenes Estructurados**: Resultados organizados con secciones clave
- ⚡ **Interfaz Moderna**: Frontend en React con Vite y renderizado Markdown
- 🔒 **Seguridad**: Manejo apropiado de variables de entorno

## Tecnologías

- **Frontend**: React 18, Vite, React Markdown
- **Backend**: Node.js, Express
- **AI**: OpenRouter API (soporta múltiples modelos)
- **Procesamiento**: PDF-parse para extracción de texto

## Instalación

### Requisitos Previos

- Node.js (v16 o superior)
- npm o yarn
- Cuenta en [OpenRouter](https://openrouter.ai/) para obtener API key

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <url-del-repositorio>
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

Edita el archivo `.env` y agrega tu API key de OpenRouter:
```
OPENAI_API_KEY=sk-or-v1-tu-api-key-aqui
```

4. **Iniciar la aplicación**
```bash
npm run dev
```

La aplicación estará disponible en:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Uso

1. Abre la aplicación en tu navegador
2. Sube un documento PDF de un artículo médico
3. Espera a que el sistema procese el documento y genere el resumen
4. Revisa el resumen estructurado con las secciones clave identificadas

## Estructura del Proyecto

```
medical-article-summarizer/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── hooks/         # Custom hooks
│   │   └── App.jsx        # Componente principal
│   └── package.json
├── server/                 # Backend Node.js
│   ├── controllers/       # Controladores
│   ├── services/          # Servicios (AI, PDF, etc.)
│   ├── utils/             # Utilidades
│   └── uploads/           # Archivos PDF subidos
├── .env.example           # Plantilla de variables de entorno
├── .gitignore            # Archivos a ignorar
└── package.json          # Scripts principales
```

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `OPENAI_API_KEY` | API key de OpenRouter | `sk-or-v1-...` |
| `MODEL` | Modelo de IA a usar | `nvidia/nemotron-3-nano-30b-a3b:free` |
| `PORT` | Puerto del servidor | `3001` |
| `SITE_URL` | URL del sitio | `http://localhost:5173` |

## Scripts Disponibles

- `npm run install:all`: Instala todas las dependencias
- `npm run dev`: Inicia frontend y backend en modo desarrollo
- `npm start`: Inicia solo el backend en producción

## Seguridad

⚠️ **IMPORTANTE**: El archivo `.env` nunca debe subirse a GitHub. Ya está configurado en `.gitignore`.

## Contribuir

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

MIT

## Instrucciones para Publicar en GitHub

### Opción 1: Usando GitHub CLI (recomendado)

Si tienes GitHub CLI instalada:

```bash
# Instalar GitHub CLI (si no está instalada)
# macOS: brew install gh
# Ubuntu: sudo apt install gh

# Autenticarte
gh auth login

# Crear repositorio público
gh repo create medical-article-summarizer --public --source=. --remote=origin --push
```

### Opción 2: Manualmente (sin GitHub CLI)

1. **Crear el repositorio en GitHub:**
   - Ve a [github.com/new](https://github.com/new)
   - Nombre del repositorio: `medical-article-summarizer`
   - Descripción: "Aplicación MERN Stack para resumir artículos médicos con IA"
   - Selecciona "Público"
   - **NO** selecciones "Initialize this repository with a README"
   - Haz clic en "Create repository"

2. **Ejecutar estos comandos en tu terminal:**

```bash
# Agregar el remote origin (usa tu nombre de usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/medical-article-summarizer.git

# Renombrar la rama principal a 'main' (recomendado)
git branch -M main

# Hacer push del código
git push -u origin main
```

3. **Verificar la publicación:**
   - Ve a `https://github.com/TU_USUARIO/medical-article-summarizer`
   - Deberías ver todos tus archivos en el repositorio

### Opción 3: Usando SSH

Si tienes configuradas las claves SSH:

```bash
# Agregar el remote usando SSH
git remote add origin git@github.com:TU_USUARIO/medical-article-summarizer.git

# Renombrar la rama principal
git branch -M main

# Hacer push
git push -u origin main
```

## Notas de Seguridad

- **NUNCA** subas el archivo `.env` con tu API key
- **NUNCA** subas archivos PDF de la carpeta `server/uploads/`
- Usa siempre `.env.example` como plantilla
- Considera usar GitHub Secrets para despliegues en producción

## Despliegue

Para desplegar en producción, considera:

- **Frontend**: Vercel, Netlify o GitHub Pages
- **Backend**: Heroku, Railway, Render o AWS
- **Variables de entorno**: Configura las variables en el servicio de despliegue

## Problemas Comunes

### Error de API Key
Asegúrate de tener una API key válida de OpenRouter en tu archivo `.env`

### Error de CORS
Verifica que `SITE_URL` en el backend coincida con la URL de tu frontend

### Archivos PDF grandes
El límite de tamaño depende de tu plan en OpenRouter y la configuración de tu servidor

## Contacto

Para preguntas o soporte, abre un issue en el repositorio de GitHub.

---

**¡Gracias por usar Medical Article Summarizer!**