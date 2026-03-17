import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', String(dark));
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
