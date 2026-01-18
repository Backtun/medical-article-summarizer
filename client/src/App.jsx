/**
 * Medical Summarizer - Aplicación Principal
 *
 * Componente raíz que orchestrates la experiencia del usuario:
 * 1. FileUploader - Drag & Drop para subir PDFs
 * 2. TerminalLog - Visualización de logs SSE en tiempo real
 * 3. SummaryViewer - Explorador de resultados estructurados
 */

import { useState, useCallback } from 'react';
import FileUploader from './components/FileUploader';
import TerminalLog from './components/TerminalLog';
import SummaryViewer from './components/SummaryViewer';
import useProcessing from './hooks/useProcessing';
import './App.css';

function App() {
  // Estados de la aplicación
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Hook personalizado para manejo de SSE
  const { connect, disconnect } = useProcessing();

  /**
   * Maneja el inicio del procesamiento
   * @param {File} file - Archivo PDF a procesar
   */
  const handleProcessStart = useCallback(async (file) => {
    setIsProcessing(true);
    setLogs([]);
    setProgress(0);
    setResult(null);

    // Conectar al stream SSE
    connect(file, {
      onLog: (log) => {
        setLogs(prev => [...prev, log]);
      },
      onProgress: (percent) => {
        setProgress(percent);
      },
      onComplete: (data) => {
        setResult(data.result);
        setProgress(100);
        setIsProcessing(false);
      },
      onError: (error) => {
        setLogs(prev => [...prev, {
          type: 'log',
          text: `Error: ${error.message}`,
          color: 'red',
          timestamp: new Date().toISOString()
        }]);
        setIsProcessing(false);
      }
    });
  }, [connect]);

  /**
   * Maneja la cancelación del procesamiento
   */
  const handleCancel = useCallback(() => {
    disconnect();
    setIsProcessing(false);
    setLogs(prev => [...prev, {
      type: 'log',
      text: 'Processing cancelled by user',
      color: 'orange',
      timestamp: new Date().toISOString()
    }]);
  }, [disconnect]);

  /**
   * Reinicia la aplicación para procesar otro archivo
   */
  const handleReset = useCallback(() => {
    setLogs([]);
    setProgress(0);
    setResult(null);
    setIsProcessing(false);
  }, []);

  return (
    <div className="app">
      {/* Disclaimer Banner */}
      <div className="disclaimer-banner">
        <span className="disclaimer-icon">⚠️</span>
        <span className="disclaimer-text">
          <strong>Aviso:</strong> Este servicio es informativo y no constituye consejo médico.
          Los resúmenes son generados por IA y deben verificarse con el documento original.
        </span>
      </div>

      <header className="app-header">
        <h1>🏥 Resumen médico</h1>
        <p>Analiza artículos médicos con IA y genera resúmenes IMRyD</p>
      </header>

      <main className="app-main">
        {/* Sección 1: Upload */}
        {!result && (
          <section className="upload-section">
            <FileUploader
              onProcessStart={handleProcessStart}
              disabled={isProcessing}
            />
          </section>
        )}

        {/* Sección 2: Terminal de Logs */}
        {(isProcessing || logs.length > 0) && !result && (
          <section className="terminal-section">
            <TerminalLog
              logs={logs}
              progress={progress}
              onCancel={handleCancel}
              isProcessing={isProcessing}
            />
          </section>
        )}

        {/* Sección 3: Visualizador de Resultados */}
        {result && (
          <section className="result-section">
            <SummaryViewer
              result={result}
              onReset={handleReset}
            />
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p className="footer-disclaimer">
          ⚠️ Generado por IA • No constituye consejo médico • Verificar siempre con el documento original
        </p>
        <p className="footer-tech">
          Powered by OpenRouter AI • MERN Stack • v1.0.0
        </p>
      </footer>
    </div>
  );
}

export default App;
