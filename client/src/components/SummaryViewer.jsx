/**
 * SummaryViewer Component - Explorador de Resultados Estructurados
 *
 * Este componente muestra el resultado del procesamiento:
 * - Árbol navegable de Parts/Chapters/Pages
 * - Visualización de contenido Markdown con react-markdown
 * - Resumen general en formato IMRyD
 */

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
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
 * Componente principal del visualizador
 */
function SummaryViewer({ result, onReset }) {
  const [selectedNode, setSelectedNode] = useState(
    result.fileTree?.[0] || null
  );
  const [activeTab, setActiveTab] = useState('tree');

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
          🔄 New Analysis
        </button>
      </div>

      {/* Info bar */}
      <div className="viewer-info">
        <span className="info-item">
          📄 {result.totalPages} pages
        </span>
        <span className="info-item">
          📁 {result.structure?.parts?.length || 0} parts
        </span>
        <span className="info-item">
          ⏱️ {new Date(result.processedAt).toLocaleString()}
        </span>
      </div>

      {/* Contenido principal */}
      <div className="viewer-content">
        {/* Sidebar: Árbol de navegación */}
        <div className="viewer-sidebar">
          <div className="sidebar-header">Document Structure</div>
          <div className="tree-container">
            {result.fileTree?.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                onSelect={handleNodeSelect}
                selectedId={selectedNode?.id}
              />
            ))}
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
                  {selectedNode.content || '*No content available*'}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>Select a section from the tree to view its content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SummaryViewer;
