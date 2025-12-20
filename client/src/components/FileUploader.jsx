/**
 * FileUploader Component - Drag & Drop para PDFs
 *
 * Componente que permite arrastrar y soltar archivos PDF
 * para iniciar el procesamiento. Implementa validación de tipo
 * y muestra feedback visual durante el estado de drag.
 */

import { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import './FileUploader.css';

function FileUploader({ onProcessStart, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  /**
   * Valida que el archivo sea un PDF
   */
  const validateFile = (file) => {
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return false;
    }
    // Limite de tamaño: 50MB
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return false;
    }
    return true;
  };

  /**
   * Manejador de drag enter
   */
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  /**
   * Manejador de drag leave
   */
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  /**
   * Manejador de drag over
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * Manejador de drop
   */
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setError(null);

      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  }, [disabled]);

  /**
   * Manejador de selección de archivo via input
   */
  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      const file = files[0];
      setError(null);

      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  }, []);

  /**
   * Inicia el procesamiento del archivo
   */
  const handleProcess = useCallback(() => {
    if (selectedFile && onProcessStart) {
      onProcessStart(selectedFile);
    }
  }, [selectedFile, onProcessStart]);

  /**
   * Limpia la selección de archivo
   */
  const handleClear = useCallback((e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Abre el dialogo de selección de archivos
   */
  const handleClick = useCallback(() => {
    if (!disabled && !selectedFile) {
      fileInputRef.current?.click();
    }
  }, [disabled, selectedFile]);

  return (
    <div className="file-uploader">
      {/* Input oculto para selección */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileSelect}
        className="file-input"
        disabled={disabled}
      />

      {/* Área de drop */}
      <div
        className={clsx('drop-zone', {
          'is-dragging': isDragging,
          'has-file': selectedFile,
          'is-disabled': disabled
        })}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {selectedFile ? (
          <div className="file-info">
            <div className="file-icon">📄</div>
            <div className="file-details">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <button
              className="clear-button"
              onClick={handleClear}
              disabled={disabled}
              type="button"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="drop-content">
            <div className="drop-icon">📁</div>
            <p className="drop-text">
              Drag & drop your medical PDF here
            </p>
            <p className="drop-subtext">
              or click to browse files
            </p>
            <span className="file-restriction">
              Maximum file size: 50MB
            </span>
          </div>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* Botón de procesar */}
      {selectedFile && !error && (
        <button
          className="process-button"
          onClick={handleProcess}
          disabled={disabled}
          type="button"
        >
          {disabled ? 'Processing...' : 'Analyze with AI'}
        </button>
      )}
    </div>
  );
}

export default FileUploader;
