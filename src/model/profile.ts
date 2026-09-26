// Profilo dell'utente autenticato e dati dei suoi dispositivi personali.
import { LEGACY_DEVICES } from '../config/house';
import {
  type Capability, CAPABILITIES, FALLBACK_PROFILE_ID, type PersonalDevice, type Profile, PROFILES,
} from '../config/profiles';
import type { EntityEntry, HassEntities, HassEntity } from '../ha/types';
import { domainOf, isFresh, numeric } from './entity';
import { isAreaPrivateForOtherUser, isCommonArea, isServiceArea, personalAreas } from './areaPolicy';
import type { Room } from './house';

/** L'identita deriva SOLO dall'id dell'account HA; mai dal telefono o dalla presenza. */
export function resolveProfile(userId: string | null | undefined): Profile {
  return (
    PROFILES.find((p) => !!userId && p.haUserIds.includes(userId)) ??
    PROFILES.find((p) => p.id === FALLBACK_PROFILE_ID)!
  );
}

/** Trova l'entita di una capability sul dispositivo; restituisce solo dati affidabili e recenti. */
export function findCapability(
  device: PersonalDevice, cap: Capability, entities: EntityEntry[], states: HassEntities, now: number,
): HassEntity | null {
  if (LEGACY_DEVICES[device.haDeviceId]) return null;
  const rule = CAPABILITIES[cap];
  const override = device.overrides?.[cap];
  const candidates = override
    ? [override]
    : entities
        .filter((e) => e.di === device.haDeviceId && domainOf(e.ei) === rule.domain)
        .map((e) => e.ei)
        .filter((id) => {
          if (rule.deviceClass && states[id]?.attributes.device_class === rule.deviceClass) return true;
          return !rule.suffixes || rule.suffixes.some((suf) => id.endsWith(suf));
        })
        .sort((a, b) => rank(a, rule.suffixes) - rank(b, rule.suffixes));
  for (const id of candidates) {
    const s = states[id];
    if (isFresh(s, now, rule.maxAgeHours)) return s;
  }
  return null;
}

const rank = (id: string, suffixes?: string[]) => {
  const i = suffixes?.findIndex((suf) => id.endsWith(suf)) ?? -1;
  return i < 0 ? 99 : i;
};

export type Presence = { at: 'home' } | { at: 'away' } | { at: 'zone'; name: string };

export interface PersonalData {
  device: PersonalDevice;
  battery?: number;
  charging?: boolean;
  presence?: Presence;
  nextAlarm?: Date;
  activity?: string;
  steps?: number;
  sleep?: { minutes: number; end: Date };
}

const ACTIVITY_LABELS: Record<string, string> = {
  still: 'Fermo', walking: 'A piedi', on_foot: 'A piedi', running: 'Di corsa', on_bicycle: 'In bici',
  in_vehicle: 'In auto', tilting: 'In movimento', stationary: 'Fermo', automotive: 'In auto', cycling: 'In bici',
};

/** Legge i dati personali disponibili; le voci assenti o non affidabili restano indefinite. */
export function readPersonal(
  device: PersonalDevice, entities: EntityEntry[], states: HassEntities, now: number,
): PersonalData {
  const get = (cap: Capability) => findCapability(device, cap, entities, states, now);
  const data: PersonalData = { device };

  const battery = numeric(get('battery') ?? undefined);
  if (battery !== null) data.battery = battery;

  const charge = get('charging');
  if (charge) data.charging = /^(charging|full)$/i.test(charge.state);

  const tracker = device.primary ? get('tracker') : null;
  if (tracker) {
    data.presence = tracker.state === 'home'
      ? { at: 'home' }
      : tracker.state === 'not_home'
        ? { at: 'away' }
        : { at: 'zone', name: tracker.state };
  }

  const alarm = get('nextAlarm');
  if (alarm) {
    const d = new Date(alarm.state);
    if (!Number.isNaN(d.getTime()) && d.getTime() > now) data.nextAlarm = d;
  }

  const activity = get('activity');
  if (activity && ACTIVITY_LABELS[activity.state]) data.activity = ACTIVITY_LABELS[activity.state];

  const steps = numeric(get('steps') ?? undefined);
  if (steps !== null) data.steps = steps;

  const sleep = get('sleep');
  const ms = numeric(sleep ?? undefined);
  const end = Number(sleep?.attributes.end);
  if (ms && ms > 0 && Number.isFinite(end) && now - end < 36 * 3_600_000) {
    data.sleep = { minutes: ms / 60_000, end: new Date(end) };
  }
  return data;
}

/**
 * Stanze raggruppate per il profilo (pagine complete: Stanze, Dispositivi).
 * - mine: aree personali del profilo (private prima delle condivise)
 * - common: aree comuni
 * - others: aree personali di altri (solo nelle pagine complete, mai in Home)
 * - service: aree di servizio
 */
export function roomGroups(profile: Profile, rooms: Room[]) {
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const mine = personalAreas(profile.id).map((id) => byId.get(id)).filter((r): r is Room => !!r);
  return {
    mine,
    common: rooms.filter((r) => isCommonArea(r.id)),
    others: rooms.filter((r) => isAreaPrivateForOtherUser(r.id, profile.id)),
    service: rooms.filter((r) => isServiceArea(r.id)),
  };
}

/** Tutte le stanze nell'ordine del profilo. */
export const orderedRooms = (profile: Profile, rooms: Room[]) => {
  const g = roomGroups(profile, rooms);
  return [...g.mine, ...g.common, ...g.others, ...g.service];
};

export interface FamilyMember {
  profile: Profile;
  presence: Presence;
  self: boolean;
}

/**
 * Presenza della famiglia: solo persone con un telefono principale affidabile.
 * Espone la sola presenza (in casa / fuori), mai batteria o altri dati del telefono.
 */
export function familyPresence(self: Profile, entities: EntityEntry[], states: HassEntities, now: number): FamilyMember[] {
  return PROFILES.filter((p) => p.kind === 'person')
    .map((p) => {
      const phone = p.devices.find((d) => d.primary);
      const presence = phone ? readPersonal(phone, entities, states, now).presence : undefined;
      return presence ? { profile: p, presence, self: p.id === self.id } : null;
    })
    .filter((x): x is FamilyMember => !!x);
}
