/**
 * Structure Service - Agrupación y Organización del Conocimiento
 *
 * Este servicio implementa la lógica para:
 * - Agrupar análisis de páginas por estructura (Parts/Chapters/Sections)
 * - Construir árbol de archivos para el frontend
 * - Generar estructura de bases de conocimiento
 */

import path from 'path';

/**
 * Formatea metadatos para mostrar en UI
 * @param {Object} metadata - Metadatos del PDF
 * @returns {string} - Markdown formateado
 */
function formatMetadata(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return '# Metadatos del Documento\n\n_No hay metadatos disponibles en este PDF._\n\nPero puedes encontrar información importante en el resumen general y las páginas del documento.';
  }

  let md = '# Metadatos del Documento\n\n';

  if (metadata.Title) md += `- **Título:** ${metadata.Title}\n`;
  if (metadata.Author) md += `- **Autor:** ${metadata.Author}\n`;
  if (metadata.Subject) md += `- **Tema:** ${metadata.Subject}\n`;
  if (metadata.Keywords) md += `- **Palabras clave:** ${metadata.Keywords}\n`;
  if (metadata.Producer) md += `- **Productor:** ${metadata.Producer}\n`;
  if (metadata.Creator) md += `- **Creador:** ${metadata.Creator}\n`;
  if (metadata.CreationDate) md += `- **Fecha de creación:** ${metadata.CreationDate}\n`;
  if (metadata.ModDate) md += `- **Fecha de modificación:** ${metadata.ModDate}\n`;
  if (metadata.PDFFormatVersion) md += `- **Versión PDF:** ${metadata.PDFFormatVersion}\n`;
  if (metadata.PageCount) md += `- **Número de páginas:** ${metadata.PageCount}\n`;

  return md;
}

/**
 * Agrupa los análisis de páginas según la estructura detectada
 * @param {Array} analyzedPages - Array de páginas analizadas
 * @param {Object} structure - Estructura detectada del documento
 * @returns {Object} - Contenido agrupado por Parts/Chapters
 */
export function groupAnalysisByStructure(analyzedPages, structure) {
  const grouped = {
    parts: [],
    orphanPages: []
  };

  // Crear un mapa de páginas por número
  const pageMap = new Map();
  analyzedPages.forEach(page => {
    pageMap.set(page.pageNumber, page);
  });

  // Procesar cada parte
  structure.parts.forEach((part, partIndex) => {
    const partData = {
      id: part.id,
      title: part.title,
      number: part.number,
      chapters: [],
      pages: []
    };

    // Añadir páginas de esta parte (antes del primer capítulo)
    const partStartPage = part.startPage;
    const firstChapterStart = part.chapters[0]?.startPage || Infinity;

    analyzedPages
      .filter(p => p.pageNumber >= partStartPage && p.pageNumber < firstChapterStart)
      .forEach(page => {
        partData.pages.push({
          pageNumber: page.pageNumber,
          analysis: page.analysis
        });
      });

    // Procesar capítulos de esta parte
    part.chapters.forEach((chapter, chapterIndex) => {
      const chapterData = {
        id: chapter.id,
        title: chapter.title,
        number: chapter.number,
        sections: [],
        pages: []
      };

      // Determinar rango de páginas del capítulo
      const chapterStartPage = chapter.startPage;
      const nextChapterStart = part.chapters[chapterIndex + 1]?.startPage || Infinity;

      // Añadir páginas del capítulo
      analyzedPages
        .filter(p => p.pageNumber >= chapterStartPage && p.pageNumber < nextChapterStart)
        .forEach(page => {
          chapterData.pages.push({
            pageNumber: page.pageNumber,
            analysis: page.analysis
          });
        });

      partData.chapters.push(chapterData);
    });

    grouped.parts.push(partData);
  });

  // Páginas huérfanas (no asignadas a ninguna parte)
  const assignedPages = new Set();
  grouped.parts.forEach(part => {
    part.pages.forEach(p => assignedPages.add(p.pageNumber));
    part.chapters.forEach(ch => {
      ch.pages.forEach(p => assignedPages.add(p.pageNumber));
    });
  });

  grouped.orphanPages = analyzedPages.filter(p => !assignedPages.has(p.pageNumber));

  return grouped;
}

/**
 * Construye el árbol de archivos para el visualizador del frontend
 * @param {Object} result - Resultado del procesamiento
 * @returns {Array} - Árbol de nodos para UI
 */
export function buildFileTree(result) {
  const tree = [];

  // Nodo raíz: Resumen General
  tree.push({
    id: 'summary',
    name: '📋 Resumen General (IMRyD)',
    type: 'summary',
    content: result.summary
  });

  // Nodo: Metadatos del documento
  tree.push({
    id: 'metadata',
    name: '📄 Metadatos',
    type: 'metadata',
    content: formatMetadata(result.metadata)
  });

  // Crear estructura Parts/Chapters
  result.structure.parts.forEach((part, partIndex) => {
    const partNode = {
      id: part.id,
      name: `📁 Part ${part.number}: ${part.title}`,
      type: 'folder',
      children: []
    };

    // Si la parte tiene capítulos, crear estructura de capítulos
    if (part.chapters && part.chapters.length > 0) {
      part.chapters.forEach((chapter, chIndex) => {
        const chapterNode = {
          id: chapter.id,
          name: `📂 Chapter ${chapter.number}: ${chapter.title}`,
          type: 'folder',
          children: []
        };

        // Buscar contenido del capítulo en groupedContent
        const partData = result.groupedContent?.parts?.[partIndex];
        const chapterData = partData?.chapters?.[chIndex];

        if (chapterData && chapterData.pages.length > 0) {
          // Crear nodo por cada página del capítulo
          chapterData.pages.forEach((page) => {
            chapterNode.children.push({
              id: `page-${page.pageNumber}`,
              name: `📄 Page ${page.pageNumber}`,
              type: 'page',
              content: page.analysis
            });
          });
        }

        partNode.children.push(chapterNode);
      });
    } else {
      // La parte no tiene capítulos, mostrar páginas directamente
      const partData = result.groupedContent?.parts?.[partIndex];
      if (partData && partData.pages.length > 0) {
        partData.pages.forEach((page) => {
          partNode.children.push({
            id: `page-${page.pageNumber}`,
            name: `📄 Page ${page.pageNumber}`,
            type: 'page',
            content: page.analysis
          });
        });
      }
    }

    tree.push(partNode);
  });

  // Páginas huérfanas
  if (result.groupedContent?.orphanPages?.length > 0) {
    const orphanNode = {
      id: 'orphan',
      name: '📑 Páginas Adicionales',
      type: 'folder',
      children: []
    };

    result.groupedContent.orphanPages.forEach(page => {
      orphanNode.children.push({
        id: `page-${page.pageNumber}`,
        name: `📄 Page ${page.pageNumber}`,
        type: 'page',
        content: page.analysis
      });
    });

    tree.push(orphanNode);
  }

  return tree;
}

export default {
  groupAnalysisByStructure,
  buildFileTree
};
