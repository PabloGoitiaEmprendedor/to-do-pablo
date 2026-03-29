import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PriorityColors {
  '20': string;
  '70': string;
  '10': string;
  optional: string;
}

interface ThemeStore {
  theme: 'light' | 'dark';
  priorityColors: PriorityColors;
  priorityNames: PriorityColors; // Reusing type for names
  setPriorityColor: (key: keyof PriorityColors, color: string) => void;
  setPriorityName: (key: keyof PriorityColors, name: string) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const DEFAULT_COLORS: PriorityColors = {
  '20': '#B4461E',
  '70': '#3264B4',
  '10': '#B4961E',
  optional: '#784698',
};

const DEFAULT_NAMES: PriorityColors = {
  '20': '20% Esencial',
  '70': '70% Expansión',
  '10': '10% Soporte',
  optional: 'Opcional',
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      priorityColors: { ...DEFAULT_COLORS },
      priorityNames: { ...DEFAULT_NAMES },
      setPriorityColor: (key, color) =>
        set((s) => {
          const updated = { ...s.priorityColors, [key]: color };
          applyPriorityColors(updated);
          return { priorityColors: updated };
        }),
      setPriorityName: (key, name) =>
        set((s) => ({ priorityNames: { ...s.priorityNames, [key]: name } })),
      toggleTheme: () => set((s) => {
        const newTheme = s.theme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        return { theme: newTheme };
      }),
      setTheme: (theme) => set(() => {
        applyTheme(theme);
        return { theme };
      }),
    }),
    { name: 'deepflow-theme' }
  )
);

function hexToHsl(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyPriorityColors(colors: PriorityColors) {
  const root = document.documentElement;
  root.style.setProperty('--priority-20', hexToHsl(colors['20']));
  root.style.setProperty('--priority-70', hexToHsl(colors['70']));
  root.style.setProperty('--priority-10', hexToHsl(colors['10']));
  root.style.setProperty('--priority-optional', hexToHsl(colors.optional));
}

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Initialize on load
export function initTheme() {
  const stored = localStorage.getItem('deepflow-theme');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.state?.priorityColors) applyPriorityColors(parsed.state.priorityColors);
      if (parsed.state?.theme) applyTheme(parsed.state.theme);
    } catch {}
  }
}
