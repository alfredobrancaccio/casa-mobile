// POLITICA DELLE AREE — unico punto che decide dove un'area puo comparire per un profilo.
// Le pagine non contengono condizioni proprie su chi "possiede" una stanza: chiedono qui.
import { AREA_OVERRIDES, type AreaRole, AREAS } from '../config/house';
import type { DeviceEntry, EntityEntry } from '../ha/types';

/**
 * Area reale di un'entita. Precedenza:
 * 1. area assegnata all'entita in HA (es. luci Dovit con dispositivo senza area);
 * 2. area del dispositivo, se l'entita non ne ha una;
 * 3. override esplicito della configurazione, solo per entita senza area in HA;
 * 4. nessuna area.
 */
export function resolveEntityArea(
  entity: Pick<EntityEntry, 'ei' | 'ai'>, device: Pick<DeviceEntry, 'area_id'> | undefined,
  overrides: Record<string, string> = AREA_OVERRIDES,
): string | null {
  return entity.ai ?? device?.area_id ?? overrides[entity.ei] ?? null;
}

const roleOf = (areaId: string | null | undefined): AreaRole | undefined => (areaId ? AREAS[areaId]?.role : undefined);
const ownersOf = (areaId: string) => AREAS[areaId]?.owners ?? [];

const isPersonalRole = (role: AreaRole | undefined) => role === 'private' || role === 'shared_personal';

/** Stanza fisica navigabile (esclude aree tecniche e ignorate). */
export const isRoomArea = (areaId: string | null | undefined) => {
  const role = roleOf(areaId);
  return !!role && role !== 'technical' && role !== 'ignored';
};

export const isCommonArea = (areaId: string | null | undefined) => roleOf(areaId) === 'common';
export const isServiceArea = (areaId: string | null | undefined) => roleOf(areaId) === 'service';

/** L'area e personale (privata o condivisa) per questo profilo. */
export function isAreaPersonalForUser(areaId: string | null | undefined, profileId: string): boolean {
  return !!areaId && isPersonalRole(roleOf(areaId)) && ownersOf(areaId).includes(profileId);
}

/** L'area e personale per qualcun altro e non per questo profilo (vale anche per il profilo Casa). */
export function isAreaPrivateForOtherUser(areaId: string | null | undefined, profileId: string): boolean {
  return !!areaId && isPersonalRole(roleOf(areaId)) && !ownersOf(areaId).includes(profileId);
}

/** Puo comparire nella Home: aree personali proprie, comuni e di servizio. */
export function canAreaAppearInHome(areaId: string | null | undefined, profileId: string): boolean {
  return isAreaPersonalForUser(areaId, profileId) || isCommonArea(areaId) || isServiceArea(areaId);
}

/**
 * Puo alimentare una scorciatoia: comandi di tutta la casa (areaId null), aree personali proprie,
 * aree comuni e di servizio. Mai l'area privata di un altro.
 */
export function canAreaAppearInShortcuts(areaId: string | null | undefined, profileId: string): boolean {
  if (!areaId) return true;
  return canAreaAppearInHome(areaId, profileId);
}

/** Stanza principale del profilo: la prima area privata di cui e proprietario (null per il profilo Casa). */
export const primaryArea = (profileId: string): string | null => personalAreas(profileId)[0] ?? null;

/** Aree personali del profilo, nell'ordine di configurazione: prima le private, poi le condivise. */
export function personalAreas(profileId: string): string[] {
  const ids = Object.keys(AREAS).filter((id) => isAreaPersonalForUser(id, profileId));
  return [...ids.filter((id) => AREAS[id].role === 'private'), ...ids.filter((id) => AREAS[id].role === 'shared_personal')];
}
