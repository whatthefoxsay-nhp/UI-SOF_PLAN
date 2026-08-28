import { useState, useEffect } from 'react';
import { debounce } from 'lodash';

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedValue(value);
    }, delay);

    handler();

    return () => {
      handler.cancel();
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useThrottle(callback, delay) {
  const [throttledCallback] = useState(() => debounce(callback, delay, { leading: true, trailing: true }));

  return throttledCallback;
}