/**
 * useProcessing Hook - Lógica de Conexión SSE
 *
 * Este hook encapsula toda la lógica de conexión Server-Sent Events:
 * - Conexión/desconexión del stream
 * - Manejo de eventos SSE (log, progress, complete, error)
 * - Upload del archivo PDF
 *
 * Nota: Las API Keys NO están en el frontend. El archivo se sube
 * al backend y el backend se comunica con OpenRouter.
 */

import { useCallback, useRef } from 'react';

/**
 * Lee un stream SSE línea por línea
 */
async function* readSSEStream(reader) {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          yield JSON.parse(line.slice(6));
        } catch (e) {
          // Ignorar errores de parsing
        }
      }
    }
  }
}

/**
 * Hook para manejar el procesamiento de PDFs via SSE
 * @returns {Object} - { connect, disconnect, isConnected }
 */
function useProcessing() {
  const abortControllerRef = useRef(null);

  /**
   * Inicia el procesamiento de un PDF
   * @param {File} file - Archivo PDF a procesar
   * @param {Object} callbacks - Callbacks para eventos
   */
  const connect = useCallback(async (file, callbacks) => {
    const { onLog, onProgress, onComplete, onError } = callbacks;

    try {
      // Crear FormData para upload del archivo
      const formData = new FormData();
      formData.append('pdf', file);

      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      // El cuerpo es un stream SSE
      const reader = response.body.getReader();

      for await (const data of readSSEStream(reader)) {
        switch (data.type) {
          case 'log':
            onLog(data);
            break;
          case 'progress':
            onProgress(data.percent);
            break;
          case 'complete':
            onComplete(data);
            return;
          case 'error':
            onError(new Error(data.message));
            return;
          default:
            break;
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    }
  }, []);

  /**
   * Desconecta el stream SSE
   */
  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    connect,
    disconnect,
    isConnected: abortControllerRef.current !== null
  };
}

export default useProcessing;
