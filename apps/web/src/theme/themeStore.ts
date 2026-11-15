import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'cifrai.theme';

const isMode = (v: unknown): v is ThemeMode => v === 'system' || v === 'light' || v === 'dark';

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return isMode(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'system') delete root.dataset.theme;
  else root.dataset.theme = mode;
}

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: readStored(),
  setMode: (mode) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // armazenamento indisponivel: o tema vale so nesta sessao
    }
    applyTheme(mode);
    set({ mode });
  },
}));
