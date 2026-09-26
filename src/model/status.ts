// Stato della casa: sicurezza (pagina dedicata) separata dai problemi tecnici secondari (manutenzione).
import { LEGACY_DEVICES, UNRELIABLE } from '../config/house';
import { LOW_BATTERY } from '../config/profiles';
import type { HassEntities, Registries } from '../ha/types';
import { cleanName, isActive, isAvailable, numeric } from './entity';
import type { EntityInfo, House, Kind } from './house';

/** Tipi di entita che appartengono alla sicurezza (pagina dedicata). */
export const SECURITY_KINDS: Kind[] = ['alarm', 'opening', 'alarmContact', 'leak'];

export interface SecurityReport {
  alarm?: EntityInfo;
  triggered: boolean;
  /** Aperture verso l'esterno aperte (solo sensori affidabili). */
  openPerimeter: EntityInfo[];
  /** Perdite d'acqua in corso. */
  leaks: EntityInfo[];
  /** Sensori di sicurezza inaffidabili o non raggiungibili. */
  anomalies: { info: EntityInfo; reason: string }[];
  perimeter: EntityInfo[];
  internalDoors: EntityInfo[];
  contacts: EntityInfo[];
  leakSensors: EntityInfo[];
  /** Segnalazioni da evidenziare sulla voce Sicurezza. */
  badge: number;
  /** Situazioni urgenti: allarme scattato o acqua rilevata. */
  critical: boolean;
}

export function securityReport(house: House, states: HassEntities): SecurityReport {
  const list = [...house.byId.values()]
    .filter((e) => SECURITY_KINDS.includes(e.kind))
    .sort((a, b) => house.areaName(a.areaId).localeCompare(house.areaName(b.areaId), 'it') || a.name.localeCompare(b.name, 'it'));
  const reliable = (e: EntityInfo) => !e.unreliable && isAvailable(states[e.id]);
  const alarm = list.find((e) => e.kind === 'alarm');
  const triggered = !!alarm && /trigger|alarm/i.test(states[alarm.id]?.state ?? '');
  const openPerimeter = list.filter((e) => e.kind === 'opening' && e.perimeter && reliable(e) && isActive(states[e.id]));
  const leaks = list.filter((e) => e.kind === 'leak' && reliable(e) && isActive(states[e.id]));
  const anomalies = list.flatMap((e) =>
    e.unreliable
      ? [{ info: e, reason: e.unreliable }]
      : states[e.id]?.state === 'unavailable'
        ? [{ info: e, reason: 'Sensore non raggiungibile.' }]
        : [],
  );
  return {
    alarm,
    triggered,
    openPerimeter,
    leaks,
    anomalies,
    perimeter: list.filter((e) => e.kind === 'opening' && e.perimeter),
    internalDoors: list.filter((e) => e.kind === 'opening' && !e.perimeter),
    contacts: list.filter((e) => e.kind === 'alarmContact'),
    leakSensors: list.filter((e) => e.kind === 'leak'),
    badge: openPerimeter.length + leaks.length + (triggered ? 1 : 0),
    critical: triggered || leaks.length > 0,
  };
}

export interface MaintenanceReport {
  unreliable: { info: EntityInfo; reason: string }[];
  offline: EntityInfo[];
  lowBattery: { key: string; name: string; value: string }[];
  legacy: string[];
}

/** Problemi tecnici secondari: finiscono in Stato e manutenzione, non in Home. */
export function maintenanceReport(house: House, reg: Registries, states: HassEntities): MaintenanceReport {
  // I sensori di sicurezza hanno la loro pagina: qui solo i problemi tecnici del resto della casa.
  const unreliable = Object.entries(UNRELIABLE)
    .map(([id, reason]) => ({ info: house.byId.get(id)!, reason }))
    .filter((x) => x.info && !SECURITY_KINDS.includes(x.info.kind));

  const offline = [...house.byId.values()]
    .filter((e) => e.listed && !SECURITY_KINDS.includes(e.kind) && states[e.id]?.state === 'unavailable')
    .sort((a, b) => house.areaName(a.areaId).localeCompare(house.areaName(b.areaId), 'it'));

  const devices = new Map(reg.devices.map((d) => [d.id, d]));
  const lowBattery: MaintenanceReport['lowBattery'] = [];
  for (const e of reg.entities) {
    if (!e.di || LEGACY_DEVICES[e.di]) continue;
    const s = states[e.ei];
    if (!isAvailable(s)) continue;
    const pct = s.attributes.device_class === 'battery' ? numeric(s) : null;
    const lowEnum = /stato_della_batteria$/.test(e.ei) && s.state === 'low';
    if ((pct !== null && pct < LOW_BATTERY) || lowEnum) {
      // telefoni e tablet hanno le loro sezioni (pagina personale, dispositivi condivisi)
      if (e.pl === 'mobile_app') continue;
      const d = devices.get(e.di);
      const name = cleanName(d?.name_by_user || d?.name || e.ei);
      lowBattery.push({ key: e.ei, name, value: pct !== null ? `${Math.round(pct)}%` : 'Bassa' });
    }
  }
  return { unreliable, offline, lowBattery, legacy: Object.values(LEGACY_DEVICES) };
}
