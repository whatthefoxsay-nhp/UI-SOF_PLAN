import { useState, useEffect, useRef } from 'react';

export function useDataWorker() {
  const [isProcessing, setIsProcessing] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker('/dataWorker.js');

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const processData = (type, data) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      setIsProcessing(true);

      const handleMessage = (e) => {
        const { success, data: result, error } = e.data;
        workerRef.current.removeEventListener('message', handleMessage);

        setIsProcessing(false);

        if (success) {
          resolve(result);
        } else {
          reject(new Error(error));
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({ type, data });
    });
  };

  return { processData, isProcessing };
}