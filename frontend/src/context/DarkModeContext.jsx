import { createContext, useContext, useState, useEffect } from 'react';

const DarkModeContext = createContext();

function readStoredDarkMode() {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem('ccs_dark_mode');
    if (!saved) return false;
    const parsed = JSON.parse(saved);
    return Boolean(parsed);
  } catch {
    localStorage.removeItem('ccs_dark_mode');
    return false;
  }
}

export function DarkModeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const dark = readStoredDarkMode();
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    return dark;
  });

  useEffect(() => {
    localStorage.setItem('ccs_dark_mode', JSON.stringify(isDark));
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleDarkMode = () => setIsDark((prev) => !prev);

  return (
    <DarkModeContext.Provider value={{ isDark, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const ctx = useContext(DarkModeContext);
  if (!ctx) throw new Error('useDarkMode must be used within DarkModeProvider');
  return ctx;
}
