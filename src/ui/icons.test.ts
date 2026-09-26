// Dimensioni delle icone: una scala per ruolo, nessun valore in pixel nei componenti.
import { describe, expect, it } from 'vitest';
import { ICON_SIZE } from './icons';

const sources = import.meta.glob(['./**/*.tsx', '../app/**/*.tsx'], { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

describe('scala delle icone', () => {
  it('ruoli ordinati e costanti', () => {
    expect(ICON_SIZE).toEqual({ inline: 16, row: 20, control: 24, feature: 28, hero: 32 });
  });

  it('nessun componente usa dimensioni in pixel', () => {
    for (const [file, src] of Object.entries(sources)) {
      expect(src, file).not.toMatch(/<Icon[^>]*size=\{\s*\d/);
    }
  });

  it('tutte le scorciatoie usano lo stesso ruolo e lo stesso contenitore', () => {
    const src = sources['./components/QuickActions.tsx'];
    const sizes = [...src.matchAll(/<Icon[^>]*size="(\w+)"/g)].map((m) => m[1]);
    expect(sizes.length).toBeGreaterThan(1);
    expect(new Set(sizes)).toEqual(new Set(['control']));
    expect(src.match(/class="quick__icon"/g)?.length).toBe(sizes.length);
  });

  it('la barra di navigazione usa un solo ruolo', () => {
    const src = sources['./components/BottomNav.tsx'];
    expect(src).not.toMatch(/<Icon[^>]*size=/); // tutte al valore predefinito "control"
  });
});
