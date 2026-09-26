// Tema dell'interfaccia: preferenza del singolo browser (automatico, chiaro, scuro).
import { signal } from '@preact/signals';

export type ThemeChoice = 'auto' | 'light' | 'dark';
const KEY = 'casa-mobile.theme';

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export const theme = signal<ThemeChoice>(read());

const THEME_METAS = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
const AUTO_COLORS = THEME_METAS.map((m) => m.content);

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === 'auto') delete root.dataset.theme;
  else root.dataset.theme = choice;
  // La barra del browser segue il tema scelto: colore letto dai token, non duplicato.
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  THEME_METAS.forEach((m, i) => (m.content = choice === 'auto' || !bg ? AUTO_COLORS[i] : bg));
}

apply(theme.value);

export function setTheme(choice: ThemeChoice): void {
  theme.value = choice;
  apply(choice);
  try {
    if (choice === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    /* preferenza valida solo per questa sessione */
  }
}
