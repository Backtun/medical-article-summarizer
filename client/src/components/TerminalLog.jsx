/**
 * TerminalLog Component - Visualizador de Logs SSE
 *
 * Este componente replica la experiencia de terminal del script Python original:
 * - Recibe eventos SSE del backend
 * - Renderiza logs con colores según el tipo (cyan, green, red, yellow)
 * - Muestra barra de progreso
 * - Efecto de typewriter para nuevos mensajes
 */

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import './TerminalLog.css';

function TerminalLog({ logs, progress, onCancel, isProcessing }) {
  const terminalRef = useRef(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  // Auto-scroll cuando hay nuevos logs
  useEffect(() => {
    if (isAutoScrolling && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, isAutoScrolling]);

  // Manejar scroll del usuario
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAutoScrolling(isAtBottom);
  };

  /**
   * Obtiene la clase CSS según el color del log
   */
  const getLogColorClass = (color) => {
    const colorMap = {
      cyan: 'log-cyan',
      green: 'log-green',
      red: 'log-red',
      yellow: 'log-yellow',
      orange: 'log-orange',
      magenta: 'log-magenta',
      blue: 'log-blue',
      gray: 'log-gray',
      white: 'log-white'
    };
    return colorMap[color] || 'log-white';
  };

  /**
   * Formatea la marca de tiempo
   */
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="terminal-container">
      {/* Header del terminal */}
      <div className="terminal-header">
        <div className="terminal-title">
          <span className="terminal-icon">⬛</span>
          <span>Medical Summarizer - Processing Terminal</span>
        </div>
        <div className="terminal-controls">
          {isProcessing && (
            <button
              className="cancel-button"
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="progress-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="progress-text">{progress}%</span>
      </div>

      {/* Área de logs */}
      <div
        ref={terminalRef}
        className="terminal-output"
        onScroll={handleScroll}
      >
        {logs.length === 0 ? (
          <div className="terminal-placeholder">
            Waiting for file upload...
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={clsx('log-line', getLogColorClass(log?.color))}
            >
              <span className="log-timestamp">
                [{formatTimestamp(log?.timestamp)}]
              </span>
              <span className="log-text">
                {typeof log?.text === 'string' ? log.text : JSON.stringify(log)}
              </span>
            </div>
          ))
        )}

        {/* Indicador de auto-scroll */}
        {!isAutoScrolling && logs.length > 0 && (
          <button
            className="scroll-indicator"
            onClick={() => setIsAutoScrolling(true)}
            type="button"
          >
            ↓ New logs ↓
          </button>
        )}
      </div>
    </div>
  );
}

export default TerminalLog;
