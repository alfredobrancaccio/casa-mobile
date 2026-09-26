// Funzioni pure su singole entita: disponibilita, freschezza, nomi, stati leggibili.
import type { HassEntity } from '../ha/types';

export const domainOf = (entityId: string) => entityId.slice(0, entityId.indexOf('.'));

export const isAvailable = (s: HassEntity | undefined): s is HassEntity =>
  !!s && s.state !== 'unavailable' && s.state !== 'unknown';

export const ageHours = (s: HassEntity, now: number) => (now - Date.parse(s.last_updated)) / 3_600_000;

/** Disponibile e aggiornata entro `maxAgeHours`. */
export const isFresh = (s: HassEntity | undefined, now: number, maxAgeHours: number): s is HassEntity =>
  isAvailable(s) && ageHours(s, now) <= maxAgeHours;

export const numeric = (s: HassEntity | undefined): number | null => {
  if (!isAvailable(s)) return null;
  const n = Number(s.state);
  return Number.isFinite(n) ? n : null;
};

/** Accesa / aperta / attiva: lo stato "on" di ogni dominio controllabile. */
export function isActive(s: HassEntity | undefined): boolean {
  if (!isAvailable(s)) return false;
  switch (domainOf(s.entity_id)) {
    case 'cover':
      return s.state === 'open' || s.state === 'opening' || s.state === 'closing';
    case 'climate':
      return s.state !== 'off';
    case 'media_player':
      return s.state === 'playing' || s.state === 'on' || s.state === 'paused' || s.state === 'buffering';
    case 'binary_sensor':
    case 'light':
    case 'switch':
    case 'fan':
      return s.state === 'on';
    default:
      return false;
  }
}

/**
 * Nome leggibile. Rimuove il nome ripetuto (dispositivo + entita omonimi) e il nome
 * della stanza quando la stanza e gia chiara dal contesto.
 */
export function cleanName(raw: string, areaName?: string): string {
  let name = raw.trim().replace(/\s+/g, ' ');
  const words = name.split(' ');
  const half = words.length / 2;
  if (Number.isInteger(half) && words.slice(0, half).join(' ').toLowerCase() === words.slice(half).join(' ').toLowerCase()) {
    name = words.slice(0, half).join(' ');
  }
  if (areaName) {
    const re = new RegExp(`^${areaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i');
    const stripped = name.replace(re, '');
    if (stripped) name = stripped;
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const fmtCache = new Map<string, Intl.NumberFormat>();
const nf = (digits: number) => {
  const key = String(digits);
  if (!fmtCache.has(key)) {
    fmtCache.set(key, new Intl.NumberFormat('it-IT', { maximumFractionDigits: digits, minimumFractionDigits: 0 }));
  }
  return fmtCache.get(key)!;
};

export const fmtNumber = (n: number, digits = 1) => nf(digits).format(n);
export const fmtTemp = (n: number) => `${nf(1).format(n)}°`;
export const fmtPercent = (n: number) => `${nf(0).format(n)}%`;

export function fmtPower(watts: number): string {
  const w = Math.abs(watts);
  return w >= 1000 ? `${nf(w >= 10_000 ? 0 : 1).format(w / 1000)} kW` : `${nf(0).format(w)} W`;
}

export const fmtEnergy = (kwh: number) => `${nf(kwh >= 100 ? 0 : 1).format(kwh)} kWh`;

const timeFmt = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDayFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'short' });

export const fmtTime = (d: Date) => timeFmt.format(d);
export const fmtLongDate = (d: Date) => dayFmt.format(d);
export const fmtWeekday = (d: Date) => shortDayFmt.format(d).replace('.', '');

/** "oggi alle 7:30", "domani alle 7:30" oppure "sab 7:30". */
export function fmtWhen(d: Date, now: number): string {
  const startOf = (t: number) => new Date(new Date(t).toDateString()).getTime();
  const days = Math.round((startOf(d.getTime()) - startOf(now)) / 86_400_000);
  if (days === 0) return `oggi alle ${fmtTime(d)}`;
  if (days === 1) return `domani alle ${fmtTime(d)}`;
  return `${fmtWeekday(d)} ${fmtTime(d)}`;
}

export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h} h ${m.toString().padStart(2, '0')} min` : `${m} min`;
}
