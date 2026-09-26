// Struttura della Home per un profilo: quali sezioni, in che ordine, con quali stanze e scorciatoie.
// Funzione pura: la pagina Home si limita a disegnare questo risultato.
import type { Profile } from '../config/profiles';
import type { HassEntities } from '../ha/types';
import { primaryArea } from './areaPolicy';
import type { House, Room } from './house';
import { roomGroups } from './profile';
import { generateShortcuts, type ResolvedShortcut } from './shortcuts';

export type { ResolvedShortcut };

export type HomeSection = 'header' | 'family' | 'personal' | 'shortcuts' | 'common' | 'energy';

export interface HomeLayout {
  sections: HomeSection[];
  /** Aree personali: la prima e la stanza principale. */
  personal: Room[];
  shortcuts: ResolvedShortcut[];
  common: Room[];
  /** Stanza principale del profilo (null per il profilo Casa): serve alle etichette delle scorciatoie. */
  primaryArea: string | null;
}

// Le aree di servizio non sono in Home: restano nella pagina Stanze (casa completa).
const PERSON_ORDER: HomeSection[] = ['header', 'family', 'personal', 'shortcuts', 'common', 'energy'];
const SHARED_ORDER: HomeSection[] = ['header', 'family', 'common', 'shortcuts', 'energy'];

export function homeLayout(profile: Profile, house: House, states: HassEntities): HomeLayout {
  const groups = roomGroups(profile, house.rooms);
  const shortcuts = generateShortcuts(profile, house, states);
  return {
    sections: profile.kind === 'person' ? PERSON_ORDER : SHARED_ORDER,
    personal: profile.kind === 'person' ? groups.mine : [],
    shortcuts,
    common: groups.common,
    primaryArea: primaryArea(profile.id),
  };
}
