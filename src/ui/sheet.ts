import { signal } from '@preact/signals';

/** Entita aperta nel pannello di dettaglio (null = chiuso). Apertura e chiusura: ui/overlays.ts. */
export const detailEntity = signal<string | null>(null);
