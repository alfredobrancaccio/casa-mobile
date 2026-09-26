// GENERAZIONE DELLE SCORCIATOIE — unica, data-driven, uguale per tutti i profili (anche in demo).
//
//   profilo -> politica delle aree -> aree ammesse -> entita candidate (area reale)
//   -> filtro private/shared/common -> filtro non disponibili/inaffidabili -> niente duplicati
//   -> capability (tipo controllabile) -> priorita -> scorciatoie finali
//
// Non esistono liste di scorciatoie per singolo utente: cambiano solo le aree del profilo.
import { AREAS, GROUPS, HOUSE } from '../config/house';
import type { Profile } from '../config/profiles';
import type { HassEntities } from '../ha/types';
import { canAreaAppearInShortcuts, isCommonArea, personalAreas } from './areaPolicy';
import { isAvailable } from './entity';
import { type EntityInfo, type House, type Kind, type LightStyle, lightStyle } from './house';

/** Da dove proviene la scorciatoia (serve a ordine, test e diagnosi). */
export type ShortcutOrigin = 'main' | 'personal' | 'global' | 'common';

export type ResolvedShortcut =
  | { kind: 'entity'; id: string; areaId: string | null; origin: ShortcutOrigin }
  | { kind: 'category'; id: 'luci' | 'tapparelle'; areaId: null; origin: 'global' };

export const MAX_SHORTCUTS = 6;
const MAIN_MAX = 4;
/** Quante voci per tipo dalla stanza principale. */
const MAIN_PER_KIND: Partial<Record<Kind, number>> = { light: 2, cover: 1, climate: 1, media: 1 };
const KIND_ORDER: Kind[] = ['light', 'cover', 'climate', 'media'];
const LIGHT_ORDER: LightStyle[] = ['group', 'ceiling', 'spot', 'lamp', 'plain', 'strip'];

/** Priorita dentro lo stesso tipo: luci principali prima delle strisce, TV prima degli altoparlanti. */
function rankInKind(e: EntityInfo, states: HassEntities): number {
  if (e.kind === 'light') return LIGHT_ORDER.indexOf(lightStyle(e));
  if (e.kind === 'media') return states[e.id]?.attributes.device_class === 'tv' || /tv/i.test(e.name) ? 0 : 1;
  return 0;
}

/** Entita comandabili di un'area, gia filtrate e ordinate. */
function candidates(house: House, states: HassEntities, profileId: string, areaId: string): EntityInfo[] {
  return [...house.byId.values()]
    .filter((e) =>
      e.areaId === areaId &&
      KIND_ORDER.includes(e.kind) &&
      (e.listed || GROUPS[e.id] === 'shortcut') &&
      !e.unreliable &&
      isAvailable(states[e.id]) &&
      canAreaAppearInShortcuts(e.areaId, profileId))
    .sort((a, b) =>
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      rankInKind(a, states) - rankInKind(b, states) ||
      a.name.localeCompare(b.name, 'it'));
}

function pick(list: EntityInfo[], perKind: Partial<Record<Kind, number>>, max: number): EntityInfo[] {
  const used = new Map<Kind, number>();
  const out: EntityInfo[] = [];
  for (const e of list) {
    if (out.length >= max) break;
    const n = used.get(e.kind) ?? 0;
    if (n >= (perKind[e.kind] ?? 0)) continue;
    used.set(e.kind, n + 1);
    out.push(e);
  }
  return out;
}

/**
 * Sottotitolo (stanza) di una scorciatoia: nascosto per la stanza principale del profilo,
 * altrimenti il nome breve della stanza. Non influisce su selezione, ordine o target.
 */
export function shortcutSubtitle(house: House, areaId: string | null, primary: string | null): string {
  if (primary !== null && areaId === primary) return '';
  return house.areaShort(areaId);
}

export function generateShortcuts(profile: Profile, house: House, states: HassEntities): ResolvedShortcut[] {
  const out: ResolvedShortcut[] = [];
  const seen = new Set<string>();
  const add = (e: EntityInfo, origin: ShortcutOrigin) => {
    if (out.length >= MAX_SHORTCUTS || seen.has(e.id)) return;
    seen.add(e.id);
    out.push({ kind: 'entity', id: e.id, areaId: e.areaId, origin });
  };
  const addLights = () => out.length < MAX_SHORTCUTS && out.push({ kind: 'category', id: 'luci', areaId: null, origin: 'global' });
  const allCovers = house.byId.get(HOUSE.allCovers);
  const allCoversOk = !!allCovers && isAvailable(states[allCovers.id]);

  const [main, ...rest] = personalAreas(profile.id);
  if (main) {
    // 1. stanza personale principale
    for (const e of pick(candidates(house, states, profile.id, main), MAIN_PER_KIND, MAIN_MAX)) add(e, 'main');
    // 2. una sola voce dalle altre aree personali (private prima delle condivise): la luce principale
    for (const area of rest) {
      const [first] = pick(candidates(house, states, profile.id, area), { light: 1 }, 1);
      if (first) {
        add(first, 'personal');
        break;
      }
    }
    // 3. azione globale utile
    addLights();
  } else {
    // Profilo condiviso: prima le azioni di tutta la casa.
    if (allCoversOk) add(allCovers!, 'global');
    addLights();
  }
  // 4. aree comuni: la luce principale di ciascuna, finche c'e posto
  for (const area of Object.keys(AREAS).filter(isCommonArea)) {
    const [first] = pick(candidates(house, states, profile.id, area), { light: 1 }, 1);
    if (first) add(first, 'common');
  }
  return out;
}
