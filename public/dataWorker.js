// dataWorker.js - Web Worker for heavy data processing
self.onmessage = function(e) {
  const { type, data } = e.data;

  switch (type) {
    case 'PARSE_JSON':
      try {
        const parsed = JSON.parse(data);
        self.postMessage({ success: true, data: parsed });
      } catch (error) {
        self.postMessage({ success: false, error: error.message });
      }
      break;

    case 'PROCESS_LARGE_ARRAY':
      try {
        // Simulate heavy processing
        const processed = data.map(item => ({
          ...item,
          processed: true,
          timestamp: Date.now()
        }));
        self.postMessage({ success: true, data: processed });
      } catch (error) {
        self.postMessage({ success: false, error: error.message });
      }
      break;

    case 'FILTER_DATA':
      try {
        const { array, filterFn } = data;
        const filtered = array.filter(item => {
          // Execute filter function in worker context
          return eval(filterFn)(item);
        });
        self.postMessage({ success: true, data: filtered });
      } catch (error) {
        self.postMessage({ success: false, error: error.message });
      }
      break;

    default:
      self.postMessage({ success: false, error: 'Unknown message type' });
  }
};