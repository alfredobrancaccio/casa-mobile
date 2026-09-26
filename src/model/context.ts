// Informazioni contestuali dell'intestazione: compaiono solo quando servono davvero.
import { HOUSE } from '../config/house';
import { LOW_BATTERY } from '../config/profiles';
import type { HassEntities } from '../ha/types';
import type { IconName } from '../ui/icons';
import { fmtNumber, fmtPercent, fmtWhen } from './entity';
import type { PersonalData } from './profile';

export interface ContextItem {
  key: string;
  icon: IconName;
  text: string;
  tone: 'neutral' | 'warning';
  href?: string;
}

const ALERT_LEVELS = ['gialla', 'arancione', 'rossa'];

/**
 * @param personal dati del telefono del profilo corrente; null per chi non ne ha e per il profilo Casa.
 *                 I dati personali non vengono mai passati per altri profili.
 */
export function headerContext(states: HassEntities, personal: PersonalData | null, now: number): ContextItem[] {
  const items: ContextItem[] = [];
  const hour = new Date(now).getHours();

  const alert = states[HOUSE.weatherAlert]?.state;
  if (alert && ALERT_LEVELS.includes(alert)) {
    items.push({ key: 'meteo', icon: 'warning', text: `Allerta meteo ${alert}`, tone: 'warning', href: '#/altro/meteo' });
  }

  if (!personal) return items;
  const phoneHref = '#/altro/personale';
  if (personal.battery !== undefined) {
    if (personal.charging) {
      items.push({ key: 'charging', icon: 'charging', text: `In carica · ${fmtPercent(personal.battery)}`, tone: 'neutral', href: phoneHref });
    } else if (personal.battery < LOW_BATTERY) {
      items.push({ key: 'battery', icon: 'batteryLow', text: `Telefono al ${fmtPercent(personal.battery)}`, tone: 'warning', href: phoneHref });
    }
  }
  // La sveglia interessa la sera e la notte, quando si prepara il giorno dopo.
  if (personal.nextAlarm && (hour >= 18 || hour < 5) && personal.nextAlarm.getTime() - now < 16 * 3_600_000) {
    items.push({ key: 'alarm', icon: 'alarm', text: `Sveglia ${fmtWhen(personal.nextAlarm, now)}`, tone: 'neutral', href: phoneHref });
  }
  if (personal.steps !== undefined && hour >= 12) {
    items.push({ key: 'steps', icon: 'walk', text: `${fmtNumber(personal.steps, 0)} passi`, tone: 'neutral', href: phoneHref });
  }
  return items;
}
