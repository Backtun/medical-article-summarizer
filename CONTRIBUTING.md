# Contribuir a Medical Article Summarizer

¡Gracias por tu interés en contribuir! Este documento proporciona las guías para contribuir al proyecto.

## Configuración del Entorno de Desarrollo

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/medical-article-summarizer.git
   cd medical-article-summarizer
   ```

2. **Instalar dependencias**
   ```bash
   npm run install:all
   ```

3. **Configurar el entorno**
   ```bash
   cp .env.example .env
   # Edita .env con tu API key
   ```

4. **Iniciar los servidores de desarrollo**
   ```bash
   npm run dev
   ```

## Estilo de Código

Usamos ESLint y Prettier para el formato del código. Antes de hacer commit:

```bash
# Verificar problemas de linting
npm run lint

# Corregir automáticamente
npm run lint:fix

# Formatear código
npm run format
```

### Guías de Estilo

- Usa **comillas simples** para strings
- Usa **2 espacios** para indentación
- Usa **punto y coma** al final de las declaraciones
- Usa **arrow functions** cuando sea apropiado
- Agrega **comentarios JSDoc** para funciones públicas

## Flujo de Trabajo con Git

1. **Crear una rama de feature**
   ```bash
   git checkout -b feature/nombre-de-tu-feature
   ```

2. **Realiza tus cambios**
   - Escribe mensajes de commit claros y descriptivos
   - Mantén los commits enfocados y atómicos
   - Referencia números de issue cuando aplique

3. **Ejecuta los tests antes de hacer commit**
   ```bash
   npm run test --prefix server
   ```

4. **Haz push y crea un Pull Request**
   ```bash
   git push origin feature/nombre-de-tu-feature
   ```

## Guías para Pull Requests

- Proporciona una descripción clara de los cambios
- Incluye capturas de pantalla para cambios en la UI
- Asegúrate de que todos los tests pasen
- Actualiza la documentación si es necesario
- Enlaza a issues relacionados

## Seguridad

- **Nunca hagas commit de API keys** o secretos
- Usa `.env` para configuración sensible
- Reporta problemas de seguridad de forma privada (ver SECURITY.md)

## Testing

- Agrega tests para nuevas funcionalidades
- Mantén la cobertura de tests
- Usa nombres descriptivos para los tests

```bash
# Ejecutar tests del servidor
npm run test --prefix server

# Ejecutar con cobertura (cuando esté configurado)
npm run test:coverage --prefix server
```

## Documentación

- Actualiza README.md para cambios que afecten al usuario
- Actualiza ARCHITECTURE.md para cambios estructurales
- Agrega comentarios JSDoc para nuevas funciones
- Mantén los comentarios actualizados

## ¿Necesitas Ayuda?

- Abre un issue para bugs o solicitudes de features
- Haz preguntas en las discusiones de issues
- Revisa los issues existentes antes de crear uno nuevo

## Licencia

Al contribuir, aceptas que tus contribuciones serán licenciadas bajo la Licencia MIT.
