import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { assetUrl } from '../assets';
import { DEFAULT_THEME, findTheme, themeImagePath, THEME_STORAGE_KEY } from '../data/gameThemes';
import { WorldThemeContext } from './worldThemeContext';

function initialTheme() {
  try { return findTheme(localStorage.getItem(THEME_STORAGE_KEY)); } catch { return DEFAULT_THEME; }
}
function preloadScene(src: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => finish(new Error('Scene timed out')), 20000);
    const finish = (error?: Error) => {
      clearTimeout(timeout); image.onload = null; image.onerror = null;
      if (error) reject(error); else resolve();
    };
    image.onload = () => { image.decode().then(() => finish(), () => finish(new Error('Scene decode failed'))); };
    image.onerror = () => finish(new Error('Scene load failed'));
    image.src = src;
  });
}
export default function WorldThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState(initialTheme);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const request = useRef(0);
  useLayoutEffect(() => {
    document.documentElement.dataset.worldTheme = theme.id;
    for (const [key, value] of Object.entries(theme.palette)) document.documentElement.style.setProperty(`--world-${key}`, value);
    try { localStorage.setItem(THEME_STORAGE_KEY, theme.id); } catch { /* Themes also work without storage. */ }
  }, [theme]);
  const selectTheme = useCallback(async (id: string) => {
    const next = findTheme(id);
    const currentRequest = ++request.current;
    setError(false);
    if (next.id === theme.id) { setPending(null); return; }
    setPending(next.id);
    try {
      await preloadScene(assetUrl(themeImagePath(next.id)));
      if (request.current === currentRequest) setTheme(next);
    } catch {
      if (request.current === currentRequest) setError(true);
    } finally {
      if (request.current === currentRequest) setPending(null);
    }
  }, [theme.id]);
  return <WorldThemeContext.Provider value={{ theme, pending, error, selectTheme }}>{children}</WorldThemeContext.Provider>;
}
