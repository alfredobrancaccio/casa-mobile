// Indicatori di stato di una stanza: stesso linguaggio in Home, Stanze e liste compatte.
import { fmtTemp } from '../model/entity';
import type { RoomSummary } from '../model/summary';
import type { IconName } from './icons';

export interface Indicator {
  key: string;
  icon: IconName;
  text: string;
  tone: 'neutral' | 'warning';
}

function coversText(open: number, total: number): string {
  if (total === 1) return open ? 'Tapparella aperta' : 'Tapparella chiusa';
  if (open === 0) return 'Tapparelle chiuse';
  if (open === total) return 'Tapparelle aperte';
  return `${open} di ${total} tapparelle aperte`;
}

/** Indicatori ordinati per rilevanza; solo cio che e acceso, aperto o degno di nota. */
export function roomIndicators(s: RoomSummary): Indicator[] {
  const out: Indicator[] = [];
  if (s.openings) out.push({ key: 'open', icon: 'windowOpen', tone: 'warning', text: s.openings === 1 ? 'Finestra aperta' : `${s.openings} aperture` });
  if (s.lightsOn) out.push({ key: 'lights', icon: 'lightOn', tone: 'neutral', text: s.lightsOn === 1 ? '1 luce accesa' : `${s.lightsOn} luci accese` });
  if (s.climateOn) {
    out.push({ key: 'climate', icon: 'radiator', tone: 'neutral', text: s.climateTarget !== null ? `Termosifone ${fmtTemp(s.climateTarget)}` : 'Termosifone acceso' });
  }
  if (s.mediaOn) out.push({ key: 'media', icon: 'tv', tone: 'neutral', text: 'TV o audio attivi' });
  if (s.covers) {
    out.push({
      key: 'covers',
      icon: s.coversOpen ? 'shutterOpen' : 'shutter',
      tone: 'neutral',
      text: coversText(s.coversOpen, s.covers),
    });
  }
  if (s.presence) out.push({ key: 'presence', icon: 'motion', tone: 'neutral', text: 'Presenza' });
  return out;
}

/** Riassunto testuale breve per le righe compatte (es. "2 luci · tapparelle aperte"). */
export function roomBrief(s: RoomSummary): string {
  const parts: string[] = [];
  if (s.openings) parts.push(s.openings === 1 ? 'finestra aperta' : `${s.openings} aperture`);
  if (s.lightsOn) parts.push(s.lightsOn === 1 ? '1 luce' : `${s.lightsOn} luci`);
  if (s.coversOpen) parts.push(s.coversOpen === 1 ? '1 tapparella aperta' : `${s.coversOpen} tapparelle aperte`);
  if (s.climateOn) parts.push('termosifone');
  if (s.mediaOn) parts.push('TV');
  return parts.length ? parts.join(' · ') : 'Tutto spento';
}
