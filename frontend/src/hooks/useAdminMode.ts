import { useState, useEffect } from 'react';

const MODE_KEY = 'admin_ui_mode';
const EVENT    = 'adminModeChange';

export function setAdminMode(mode: 'staff' | 'admin') {
  localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: mode }));
}

export function useAdminMode() {
  const [mode, setMode] = useState<'staff' | 'admin'>(
    () => (localStorage.getItem(MODE_KEY) as 'staff' | 'admin') ?? 'admin',
  );

  useEffect(() => {
    const handler = (e: Event) => setMode((e as CustomEvent<'staff' | 'admin'>).detail);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  return mode;
}
