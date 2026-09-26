// Costruisce il modello della casa dai registry di HA e dalla configurazione centrale.
import {
  ALSO_SHOW_IN, AREAS, type AreaRole, DUPLICATES, GROUPS, HIDDEN, HIDDEN_PATTERNS, HOUSE, LEGACY_DEVICES,
  NAMES, PERIMETER, UNRELIABLE,
} from '../config/house';
import type { HassEntities, Registries } from '../ha/types';
import type { IconName } from '../ui/icons';
import { isRoomArea, resolveEntityArea } from './areaPolicy';
import { cleanName, domainOf } from './entity';

/** Tipo funzionale di un'entita, indipendente dalla piattaforma che la fornisce. */
export type Kind =
  | 'light' | 'cover' | 'climate' | 'switch' | 'media' | 'scene'
  | 'temperature' | 'humidity' | 'opening' | 'hatch' | 'presence' | 'leak' | 'alarmContact' | 'alarm';

export interface EntityInfo {
  id: string;
  domain: string;
  kind: Kind;
  name: string;
  areaId: string | null;
  deviceId: string | null;
  /** Mostrata nelle liste (false per i gruppi usati solo come scorciatoia). */
  listed: boolean;
  perimeter: boolean;
  unreliable?: string;
}

export interface Room {
  id: string;
  name: string;
  short: string;
  role: AreaRole;
  icon: IconName;
  entities: EntityInfo[];
  /** Entita di altre aree mostrate qui come contesto (alsoShowIn). */
  related: EntityInfo[];
  temperature?: string;
  humidity?: string;
}

export interface House {
  rooms: Room[];
  byId: Map<string, EntityInfo>;
  areaName: (areaId: string | null) => string;
  /** Nome breve dell'area (es. "Giacomo" per Camera Giacomo), per etichette compatte. */
  areaShort: (areaId: string | null) => string;
}

const SECONDARY = new Set(DUPLICATES.flatMap((d) => d.secondary));

function isExcluded(id: string): boolean {
  return SECONDARY.has(id) || HIDDEN.includes(id) || HIDDEN_PATTERNS.some((re) => re.test(id)) || GROUPS[id] === 'hidden';
}

function classify(id: string, deviceClass: string | undefined, platform: string): Kind | null {
  const domain = domainOf(id);
  if (id === HOUSE.alarm) return 'alarm';
  switch (domain) {
    case 'light': return 'light';
    case 'cover': return 'cover';
    case 'climate': return 'climate';
    case 'switch': case 'fan': case 'valve': return 'switch';
    case 'media_player': return 'media';
    case 'scene': return 'scene';
    case 'sensor':
      if (deviceClass === 'temperature') return 'temperature';
      if (deviceClass === 'humidity') return 'humidity';
      return null;
    case 'binary_sensor':
      if (deviceClass === 'door' || deviceClass === 'window' || deviceClass === 'garage_door') return 'opening';
      if (deviceClass === 'opening') return 'hatch';
      if (deviceClass === 'motion' || deviceClass === 'occupancy' || deviceClass === 'presence') return 'presence';
      if (deviceClass === 'moisture') return 'leak';
      // Sensori della centrale d'allarme Dovit (contatti, grate, volumetrici senza classe)
      if (!deviceClass && platform === 'mqtt') return 'alarmContact';
      return null;
    default:
      return null;
  }
}

export type LightStyle = 'group' | 'ceiling' | 'spot' | 'lamp' | 'plain' | 'strip';

/** Tipo di luce ricavato da configurazione (gruppi) e nome: serve a icone e priorita. */
export function lightStyle(info: Pick<EntityInfo, 'id' | 'name'>): LightStyle {
  if (GROUPS[info.id]) return 'group';
  const n = info.name;
  if (/led|veletta|striscia|strisce|sotto letto|ambilight/i.test(n)) return 'strip';
  if (/lampadario|centrale/i.test(n)) return 'ceiling';
  if (/farett|quadro/i.test(n)) return 'spot';
  if (/lume|lampada|palla|comodino|divano|nicchia|scrivania|applique/i.test(n)) return 'lamp';
  return 'plain';
}

/** Le aree tecniche forniscono solo impianto e allarme, mai "stanze". */
const TECHNICAL_KINDS: Kind[] = ['switch', 'alarm'];

export function buildHouse(reg: Registries, states: HassEntities): House {
  const areaNames = new Map(reg.areas.map((a) => [a.area_id, a.name]));
  const devices = new Map(reg.devices.map((d) => [d.id, d]));
  const byId = new Map<string, EntityInfo>();

  for (const e of reg.entities) {
    const state = states[e.ei];
    if (!state) continue; // entita disabilitata o non caricata
    if (e.ec !== undefined) continue; // configurazione o diagnostica
    const domain = domainOf(e.ei);
    if (e.hb && domain !== 'cover') continue; // le tapparelle Dovit sono nascoste in HA ma sono quelle reali
    if (e.di && LEGACY_DEVICES[e.di]) continue;
    if (isExcluded(e.ei)) continue;

    const deviceClass = state.attributes.device_class as string | undefined;
    const kind = classify(e.ei, deviceClass, e.pl);
    if (!kind) continue;

    const areaId = resolveEntityArea(e, e.di ? devices.get(e.di) : undefined);
    const inHouse = isRoomArea(areaId);
    const technical = !!areaId && AREAS[areaId]?.role === 'technical' && TECHNICAL_KINDS.includes(kind);
    if (!inHouse && !technical) continue;

    const areaName = areaId ? areaNames.get(areaId) : undefined;
    byId.set(e.ei, {
      id: e.ei,
      domain,
      kind,
      name: NAMES[e.ei] ?? cleanName(e.en || (state.attributes.friendly_name as string) || e.ei, areaName),
      areaId,
      deviceId: e.di ?? null,
      listed: GROUPS[e.ei] !== 'shortcut',
      perimeter: PERIMETER.includes(e.ei),
      unreliable: UNRELIABLE[e.ei],
    });
  }

  // Gruppo di tutta la casa (senza area): usato come comando collettivo, mai come voce di stanza.
  if (states[HOUSE.allCovers]) {
    byId.set(HOUSE.allCovers, {
      id: HOUSE.allCovers, domain: 'cover', kind: 'cover', name: 'Tutte le tapparelle',
      areaId: null, deviceId: null, listed: false, perimeter: false,
    });
  }

  const areaName = (areaId: string | null) =>
    areaId && AREAS[areaId]?.role === 'technical' ? 'Impianto' : areaNames.get(areaId ?? '') ?? '';

  const rooms: Room[] = [];
  for (const [areaId, cfg] of Object.entries(AREAS)) {
    if (!isRoomArea(areaId)) continue;
    const name = areaNames.get(areaId);
    if (!name) continue;
    const entities = [...byId.values()]
      .filter((x) => x.areaId === areaId && x.listed)
      .sort((a, b) => a.name.localeCompare(b.name, 'it'));
    const related = Object.entries(ALSO_SHOW_IN)
      .filter(([, areas]) => areas.includes(areaId))
      .map(([id]) => byId.get(id))
      .filter((x): x is EntityInfo => !!x);
    rooms.push({
      id: areaId,
      name,
      short: cfg.short ?? name,
      role: cfg.role,
      icon: cfg.icon,
      entities,
      related,
      temperature: entities.find((x) => x.kind === 'temperature')?.id,
      humidity: entities.find((x) => x.kind === 'humidity')?.id,
    });
  }

  return {
    rooms,
    byId,
    areaName,
    areaShort: (areaId) => (areaId && AREAS[areaId]?.short) || areaName(areaId),
  };
}
