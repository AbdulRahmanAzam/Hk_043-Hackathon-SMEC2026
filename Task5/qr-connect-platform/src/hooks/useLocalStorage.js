import { useState, useEffect } from 'react';

// Small hook to keep state in sync with localStorage
export default function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch (e) {
      console.error('useLocalStorage parse error', e);
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error('useLocalStorage save error', e);
    }
  }, [key, state]);

  return [state, setState];
}
