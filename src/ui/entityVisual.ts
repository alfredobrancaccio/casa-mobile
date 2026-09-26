// Icona e stato leggibile di un'entita: la stessa resa in tutta l'app.
import type { HassEntity } from '../ha/types';
import { fmtPercent, fmtTemp, isActive, isAvailable, numeric } from '../model/entity';
import { type EntityInfo, type LightStyle, lightStyle } from '../model/house';
import type { IconName } from './icons';

const match = (text: string, table: [RegExp, IconName][], fallback: IconName): IconName =>
  table.find(([re]) => re.test(text))?.[1] ?? fallback;

const LIGHT_ICONS: Partial<Record<LightStyle, IconName>> = {
  group: 'lightGroup', strip: 'ledStrip', ceiling: 'ceiling', spot: 'spot', lamp: 'lamp',
};

export function iconFor(info: EntityInfo, s: HassEntity | undefined): IconName {
  const on = isActive(s);
  const name = info.name;
  switch (info.kind) {
    case 'light':
      return LIGHT_ICONS[lightStyle(info)] ?? (on ? 'lightOn' : 'light');
    case 'cover':
      return on ? 'shutterOpen' : 'shutter';
    case 'climate':
      return on ? 'radiator' : 'radiatorOff';
    case 'switch':
      return match(name, [
        [/forno/i, 'stove'], [/lavastoviglie/i, 'dishwasher'], [/lavatrice/i, 'washing'], [/aspiratore/i, 'fan'],
        [/riscald|antiappann/i, 'heater'], [/irrigaz/i, 'irrigation'], [/aria condizionata/i, 'airConditioner'],
      ], 'outlet');
    case 'media':
      return match(name, [[/fire tv/i, 'streamer'], [/^tv/i, 'tv'], [/echo/i, 'speaker']],
        s?.attributes.device_class === 'tv' ? 'tv' : 'speaker');
    case 'scene':
      return /clima|deumid/i.test(name) ? 'airConditioner' : 'scene';
    case 'temperature':
      return 'thermometer';
    case 'humidity':
      return 'humidity';
    case 'opening':
      if (s?.attributes.device_class === 'garage_door') return on ? 'garageOpen' : 'garage';
      if (s?.attributes.device_class === 'window' || /finestra/i.test(name)) return on ? 'windowOpen' : 'windowClosed';
      return on ? 'doorOpen' : 'doorClosed';
    case 'hatch':
      return 'airConditioner';
    case 'presence':
      return match(name, [[/letto/i, 'bed'], [/sedia/i, 'chair']], 'motion');
    case 'leak':
      return 'leak';
    case 'alarmContact':
      return /grata/i.test(name) ? 'grate' : 'shield';
    case 'alarm':
      return s?.state === 'disarmed' ? 'shieldHome' : 'shieldOk';
  }
}

const MEDIA: Record<string, string> = {
  playing: 'In riproduzione', paused: 'In pausa', idle: 'Inattivo', on: 'Acceso', off: 'Spento',
  standby: 'Spento', buffering: 'Caricamento…',
};

const ALARM: Record<string, string> = {
  disarmed: 'Disinserito', armed_away: 'Inserito totale', armed_home: 'Inserito parziale',
  armed_night: 'Inserito notte', armed: 'Inserito', triggered: 'In allarme', pending: 'In attivazione',
};

/** Testo di stato in italiano; mai "unavailable", "unknown" o "N/A". */
export function stateText(info: EntityInfo, s: HassEntity | undefined): string {
  if (!s || s.state === 'unavailable') return 'Non raggiungibile';
  const on = isActive(s);
  const a = s.attributes;
  switch (info.kind) {
    case 'light': {
      if (!on) return 'Spenta';
      const b = Number(a.brightness);
      return b > 0 ? `Accesa · ${fmtPercent((b / 255) * 100)}` : 'Accesa';
    }
    case 'cover': {
      if (s.state === 'opening') return 'In apertura';
      if (s.state === 'closing') return 'In chiusura';
      const pos = Number(a.current_position);
      if (s.state === 'open') return Number.isFinite(pos) && pos > 0 && pos < 100 ? `Aperta · ${pos}%` : 'Aperta';
      return 'Chiusa';
    }
    case 'climate': {
      const target = Number(a.temperature);
      if (!on) return 'Spento';
      return Number.isFinite(target) ? `Acceso · ${fmtTemp(target)}` : 'Acceso';
    }
    case 'switch':
      return on ? 'Acceso' : 'Spento';
    case 'media':
      return (s.state === 'playing' && typeof a.media_title === 'string' ? a.media_title : MEDIA[s.state]) ?? 'Acceso';
    case 'scene':
      return 'Scena';
    case 'temperature': {
      const n = numeric(s);
      return n === null ? '—' : fmtTemp(n);
    }
    case 'humidity': {
      const n = numeric(s);
      return n === null ? '—' : fmtPercent(n);
    }
    case 'opening':
      return on ? 'Aperta' : 'Chiusa';
    case 'hatch':
      return on ? 'Aperto' : 'Chiuso';
    case 'presence':
      if (a.device_class === 'motion') return on ? 'Movimento' : 'Nessun movimento';
      return on ? 'Occupato' : 'Libero';
    case 'leak':
      return on ? 'Acqua rilevata' : 'Asciutto';
    case 'alarmContact':
      return on ? 'Rilevato' : 'A riposo';
    case 'alarm':
      return ALARM[s.state] ?? (isAvailable(s) ? s.state : 'Non raggiungibile');
  }
}
