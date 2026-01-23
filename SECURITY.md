# Política de Seguridad

## Versiones Soportadas

| Versión | Soportada          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reportar una Vulnerabilidad

Si descubres una vulnerabilidad de seguridad, por favor repórtala de manera responsable:

1. **NO** abras un issue público en GitHub
2. Envía un correo con los detalles de seguridad a los mantenedores del proyecto
3. Incluye una descripción detallada de la vulnerabilidad
4. Permite un tiempo razonable para la corrección antes de la divulgación pública

## Medidas de Seguridad

### Implementadas Actualmente

- ✅ Validación de tipo MIME para PDFs
- ✅ Límites de tamaño de archivo (máximo 50MB)
- ✅ Limpieza de archivos temporales después del procesamiento
- ✅ Aislamiento de variables de entorno para API keys
- ✅ Configuración de CORS
- ✅ `.env` excluido del control de versiones

### Mejoras Planificadas

- 🔲 Rate limiting (solicitudes por IP)
- 🔲 Validación de magic bytes de PDF
- 🔲 Límites máximos de páginas
- 🔲 Protección por timeout en el parsing
- 🔲 Parsing de PDF en sandbox
- 🔲 Headers de Content Security Policy
- 🔲 Protección CSRF

## Manejo de Datos Sensibles

### Procesamiento de Documentos

- Los PDFs se almacenan temporalmente en `/server/uploads/` durante el procesamiento
- Los archivos se eliminan automáticamente después de que el procesamiento termine o falle
- El contenido del documento se envía a la API de IA para el análisis
- No hay almacenamiento persistente del contenido del documento en el servidor

### Logging

- Los logs de producción NO deben contener texto del documento
- Las API keys nunca se registran en logs
- Los eventos SSE pueden contener texto de vista previa (configurable)

### Servicios de Terceros

- **API de OpenRouter/Chutes**: El texto del documento se envía para procesamiento de IA
- Revisa la política de privacidad del proveedor de IA para detalles sobre el manejo de datos
- Considera el modo "no-store" para documentos sensibles (funcionalidad planificada)

## Consideraciones de Seguridad para PDFs

Los PDFs pueden ser vectores de ataque. Esta aplicación implementa:

1. **Validación de Tipo**: Verifica el tipo MIME antes del procesamiento
2. **Límites de Tamaño**: Rechaza archivos mayores a 50MB
3. **Limpieza**: Elimina archivos subidos después del procesamiento

### Riesgos Conocidos

- **Exploits en parsing de PDF**: La librería `pdf-parse` procesa PDFs en el proceso principal
- **Agotamiento de recursos**: PDFs grandes o complejos pueden consumir mucha memoria
- **Prompt injection**: Contenido malicioso en PDFs podría intentar manipular el comportamiento de la IA

## Mejores Prácticas para Despliegue

1. **Nunca hagas commit de archivos `.env`** con API keys reales
2. **Usa HTTPS** en producción
3. **Configura orígenes CORS restrictivos**
4. **Habilita rate limiting** para prevenir abuso
5. **Monitorea** el uso de la API y los costos
6. **Rota las API keys** periódicamente

## Variables de Entorno

Asegúrate de que estas estén correctamente protegidas:

| Variable | Sensibilidad | Notas |
|----------|--------------|-------|
| `CHUTES_API_KEY` | **ALTA** | Nunca logear o exponer |
| `PORT` | Baja | Configuración interna |
| `CLIENT_URL` | Baja | Usado para CORS |
| `MODEL` | Baja | Selección del modelo de IA |

## Aviso Legal

Esta aplicación genera resúmenes basados en IA de artículos médicos. Estos resúmenes:

- Son **solo informativos** y no constituyen consejo médico
- Pueden contener errores u omisiones
- Siempre deben verificarse contra el documento original
- No deben usarse para toma de decisiones clínicas sin revisión de expertos

---

Última actualización: 2026-01-22
