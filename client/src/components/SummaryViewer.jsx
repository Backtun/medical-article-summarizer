/**
 * SummaryViewer Component - Explorador de Resultados Estructurados
 *
 * Este componente muestra el resultado del procesamiento:
 * - Árbol navegable de Parts/Chapters/Pages
 * - Visualización de contenido Markdown con react-markdown
 * - Resumen general en formato IMRyD
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import ExportButtons from './ExportButtons';
import './SummaryViewer.css';

/**
 * Componente para renderizar nodos del árbol
 */
function TreeNode({ node, level = 0, onSelect, selectedId }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = useCallback(() => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onSelect(node);
  }, [hasChildren, isExpanded, node, onSelect]);

  const getNodeIcon = () => {
    if (hasChildren) {
      return isExpanded ? '📂' : '📁';
    }
    const iconMap = {
      summary: '📋',
      metadata: '📄',
      page: '📝',
      folder: '📁'
    };
    return iconMap[node.type] || '📄';
  };

  return (
    <div className="tree-node-container">
      <div
        className={clsx('tree-node', {
          'is-selected': selectedId === node.id,
          'is-folder': hasChildren
        })}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={handleClick}
      >
        <span className="node-icon">{getNodeIcon()}</span>
        <span className="node-name">{node.name}</span>
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Función auxiliar para contar solo las páginas del árbol
 * Solo cuenta nodos de tipo 'page' que tienen contenido real
 */
function countPages(nodes) {
  if (!nodes || !Array.isArray(nodes)) return 0;
  return nodes.reduce((count, node) => {
    const isPage = node.type === 'page';
    return count + (isPage ? 1 : 0) + countPages(node.children);
  }, 0);
}

/**
 * Componente principal del visualizador
 */
function SummaryViewer({ result, onReset }) {
  const [selectedNode, setSelectedNode] = useState(
    result.fileTree?.[0] || null
  );
  const [activeTab, setActiveTab] = useState('tree');
  const [scrollState, setScrollState] = useState({ canScrollUp: false, canScrollDown: false });
  const treeContainerRef = useRef(null);

  // Calcular el total de páginas en el árbol
  const totalPages = countPages(result.fileTree);

  // Detectar estado de scroll
  const updateScrollState = useCallback(() => {
    const container = treeContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const canScrollUp = scrollTop > 0;
    const canScrollDown = scrollTop + clientHeight < scrollHeight - 1;

    setScrollState({ canScrollUp, canScrollDown });
  }, []);

  useEffect(() => {
    const container = treeContainerRef.current;
    if (!container) return;

    // Verificar estado inicial
    updateScrollState();

    // Observar cambios de tamaño
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [updateScrollState, result.fileTree]);

  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node);
    if (node.type === 'summary' || node.type === 'metadata' || node.type === 'page') {
      setActiveTab('content');
    }
  }, []);

  return (
    <div className="summary-viewer">
      {/* Header */}
      <div className="viewer-header">
        <div className="viewer-title">
          <h2>📊 Análisis completo</h2>
          <p className="document-title">{result.title}</p>
        </div>
        <button
          className="new-analysis-button"
          onClick={onReset}
          type="button"
        >
          🔄 Nuevo Análisis
        </button>
      </div>

      {/* Info bar */}
      <div className="viewer-info">
        <span className="info-item">
          📄 {result.totalPages} páginas
        </span>
        <span className="info-item">
          📁 {result.structure?.parts?.length || 0} partes
        </span>
        <span className="info-item">
          ⏱️ {new Date(result.processedAt).toLocaleString()}
        </span>
      </div>

      {/* Export and disclaimer */}
      <div className="viewer-actions">
        <ExportButtons result={result} />
        <span className="viewer-disclaimer">
          ⚠️ Generado por IA • Verificar con documento original
        </span>
      </div>

      {/* Contenido principal */}
      <div className="viewer-content">
        {/* Sidebar: Árbol de navegación */}
        <div className="viewer-sidebar">
          <div className="sidebar-header">
            <span>Estructura del Documento</span>
            <span className="sidebar-count">{totalPages} {totalPages === 1 ? 'página' : 'páginas'}</span>
          </div>
          <div className="tree-wrapper">
            {scrollState.canScrollUp && (
              <div className="scroll-indicator scroll-indicator--top" aria-hidden="true">
                <span className="scroll-indicator-icon">▲</span>
              </div>
            )}
            <div
              ref={treeContainerRef}
              className="tree-container"
              onScroll={updateScrollState}
            >
              {result.fileTree?.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  onSelect={handleNodeSelect}
                  selectedId={selectedNode?.id}
                />
              ))}
            </div>
            {scrollState.canScrollDown && (
              <div className="scroll-indicator scroll-indicator--bottom" aria-hidden="true">
                <span className="scroll-indicator-icon">▼</span>
                <span className="scroll-indicator-text">Desplaza para ver más</span>
              </div>
            )}
          </div>
        </div>

        {/* Panel de contenido */}
        <div className="viewer-main">
          {selectedNode ? (
            <div className="content-panel">
              <div className="content-header">
                <h3>{selectedNode.name}</h3>
                <span className="content-type">
                  {selectedNode.type?.toUpperCase()}
                </span>
              </div>
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedNode.content || '*No hay contenido disponible*'}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>Selecciona una sección del árbol para ver su contenido</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SummaryViewer;
