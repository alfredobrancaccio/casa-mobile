// Router su hash: funziona anche servito da /local senza configurare il server.
// La history e gestita da app/navigation.ts (una sola history, quella del browser).
import { signal } from '@preact/signals';
import { browserEnv, createNavigator } from './navigation';

export type Tab = 'home' | 'stanze' | 'dispositivi' | 'energia' | 'altro';

export interface Route {
  tab: Tab;
  /** Sotto-pagina, es. l'id di una stanza o di una categoria. */
  param?: string;
}

const TABS: Tab[] = ['home', 'stanze', 'dispositivi', 'energia', 'altro'];

export function parse(hash: string): Route {
  const [tab, param] = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (!TABS.includes(tab as Tab)) return { tab: 'home' };
  // "Altro" non e una pagina: esistono solo le sue sotto-pagine.
  if (tab === 'altro' && !param) return { tab: 'home' };
  return { tab: tab as Tab, param: param || undefined };
}

export const href = (tab: Tab, param?: string) => (param ? `#/${tab}/${encodeURIComponent(param)}` : `#/${tab}`);

export const route = signal<Route>(parse(window.location.hash));

export const nav = createNavigator(browserEnv(), (hash) => (route.value = parse(hash)));

/** Vero se `target` e esattamente la pagina corrente (evita voci doppie nella history). */
export const isCurrent = (target: string) => {
  const t = parse(target);
  return t.tab === route.value.tab && t.param === route.value.param;
};
