// Riepiloghi per stanza e per categoria di dispositivi.
import type { HassEntities } from '../ha/types';
import type { IconName } from '../ui/icons';
import { isActive, isAvailable, numeric } from './entity';
import type { EntityInfo, House, Kind, Room } from './house';

export interface RoomSummary {
  temperature: number | null;
  humidity: number | null;
  lightsOn: number;
  lights: number;
  coversOpen: number;
  covers: number;
  openings: number;
  /** Temperatura impostata del termosifone acceso, se presente. */
  climateTarget: number | null;
  climateOn: number;
  mediaOn: number;
  presence: boolean;
}

export function roomSummary(room: Room, states: HassEntities): RoomSummary {
  const of = (kind: Kind) => room.entities.filter((e) => e.kind === kind);
  const active = (list: EntityInfo[]) => list.filter((e) => isActive(states[e.id])).length;
  const climates = of('climate').filter((e) => isActive(states[e.id]));
  const target = climates.length ? Number(states[climates[0].id]?.attributes.temperature) : NaN;
  return {
    temperature: room.temperature ? numeric(states[room.temperature]) : null,
    humidity: room.humidity ? numeric(states[room.humidity]) : null,
    lightsOn: active(of('light')),
    lights: of('light').length,
    coversOpen: active(of('cover')),
    covers: of('cover').filter((e) => isAvailable(states[e.id])).length,
    openings: of('opening').filter((e) => e.perimeter && !e.unreliable && isActive(states[e.id])).length,
    climateTarget: Number.isFinite(target) ? target : null,
    climateOn: climates.length,
    mediaOn: active(of('media')),
    presence: of('presence').some((e) => isActive(states[e.id])),
  };
}

export interface Category {
  id: string;
  label: string;
  icon: IconName;
  kinds: Kind[];
}

export const CATEGORIES: Category[] = [
  { id: 'luci', label: 'Luci', icon: 'lightOn', kinds: ['light'] },
  { id: 'tapparelle', label: 'Tapparelle', icon: 'shutter', kinds: ['cover'] },
  { id: 'clima', label: 'Clima', icon: 'thermometer', kinds: ['climate', 'temperature', 'humidity'] },
  { id: 'prese', label: 'Prese e utenze', icon: 'outlet', kinds: ['switch'] },
  { id: 'media', label: 'Media', icon: 'tv', kinds: ['media'] },
  { id: 'scene', label: 'Scene', icon: 'scene', kinds: ['scene'] },
  { id: 'sensori', label: 'Sensori', icon: 'motion', kinds: ['presence', 'hatch'] },
  { id: 'sicurezza', label: 'Sicurezza', icon: 'shieldHome', kinds: ['alarm', 'alarmContact', 'opening', 'leak'] },
];

export const categoryEntities = (house: House, cat: Category) =>
  [...house.byId.values()].filter((e) => e.listed && cat.kinds.includes(e.kind));

/** Frase breve che riassume lo stato di una categoria. */
export function categorySummary(house: House, cat: Category, states: HassEntities): string {
  const list = categoryEntities(house, cat);
  const active = list.filter((e) => isActive(states[e.id])).length;
  switch (cat.id) {
    case 'luci':
      return active ? `${active} accese su ${list.length}` : 'Tutte spente';
    case 'tapparelle':
      return active ? `${active} aperte su ${list.length}` : 'Tutte chiuse';
    case 'clima': {
      const heating = list.filter((e) => e.kind === 'climate' && isActive(states[e.id])).length;
      const rooms = list.filter((e) => e.kind === 'temperature' && isAvailable(states[e.id])).length;
      if (heating) return `${heating} ${heating === 1 ? 'termosifone acceso' : 'termosifoni accesi'}`;
      return `${rooms} stanze misurate`;
    }
    case 'prese':
      return active ? `${active} accese` : 'Tutte spente';
    case 'media':
      return active ? `${active} in uso` : 'Nessuno in uso';
    case 'scene':
      return `${list.length} scene`;
    case 'sensori':
      return `${list.length} sensori`;
    case 'sicurezza': {
      const open = list.filter((e) => e.kind === 'opening' && e.perimeter && !e.unreliable && isActive(states[e.id])).length;
      return open ? `${open} ${open === 1 ? 'apertura' : 'aperture'}` : 'Tutto chiuso';
    }
    default:
      return '';
  }
}
