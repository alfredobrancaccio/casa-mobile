// Lettura dei dati energetici in grandezze coerenti (W, kWh).
import { BATTERY, COUNTERS, type EnergyNode, FLOWS, POWER } from '../config/energy';
import type { HassEntities, HassEntity, StatRow } from '../ha/types';
import { isAvailable, numeric } from './entity';

/** Converte in watt rispettando l'unita dichiarata dal sensore. */
export function watts(s: HassEntity | undefined): number | null {
  const n = numeric(s);
  if (n === null || !s) return null;
  const unit = String(s.attributes.unit_of_measurement ?? 'W');
  return unit === 'kW' ? n * 1000 : unit === 'MW' ? n * 1_000_000 : n;
}

export interface PowerNow {
  solar: number | null;
  grid: number | null;
  battery: number | null;
  home: number | null;
  flows: { from: EnergyNode; to: EnergyNode; watts: number }[];
  charge: number | null;
  reserve: number | null;
  gridUp: boolean | null;
}

/** Sotto questa soglia un flusso e considerato nullo (rumore di misura). */
const IDLE_W = 20;

export function readPower(states: HassEntities): PowerNow {
  const w = (id: string) => watts(states[id]);
  const up = states[BATTERY.gridUp];
  return {
    solar: w(POWER.solar),
    grid: w(POWER.grid),
    battery: w(POWER.battery),
    home: w(POWER.home),
    flows: FLOWS.map((f) => ({ from: f.from, to: f.to, watts: w(f.entity) ?? 0 })).filter((f) => f.watts > IDLE_W),
    charge: numeric(states[BATTERY.charge]),
    reserve: numeric(states[BATTERY.reserve]),
    gridUp: isAvailable(up) ? up.state === 'on' : null,
  };
}

export const hasPowerData = (p: PowerNow) => p.home !== null;

export interface DayTotals {
  start: number;
  solar: number;
  gridIn: number;
  gridOut: number;
  batteryIn: number;
  batteryOut: number;
  home: number;
}

/** Totali giornalieri dai contatori: consumo = rete + solare + batteria − immissione − ricarica. */
export function dailyTotals(stats: Record<string, StatRow[]>): DayTotals[] {
  const days = new Map<number, DayTotals>();
  const add = (id: string, key: keyof Omit<DayTotals, 'start' | 'home'>) => {
    for (const r of stats[id] ?? []) {
      const d = days.get(r.start) ?? { start: r.start, solar: 0, gridIn: 0, gridOut: 0, batteryIn: 0, batteryOut: 0, home: 0 };
      d[key] += Math.max(0, r.change ?? 0);
      days.set(r.start, d);
    }
  };
  add(COUNTERS.solar, 'solar');
  add(COUNTERS.gridIn, 'gridIn');
  add(COUNTERS.gridOut, 'gridOut');
  add(COUNTERS.batteryIn, 'batteryIn');
  add(COUNTERS.batteryOut, 'batteryOut');
  return [...days.values()]
    .map((d) => ({ ...d, home: Math.max(0, d.gridIn + d.solar + d.batteryOut - d.gridOut - d.batteryIn) }))
    .sort((a, b) => a.start - b.start);
}

/** Quota del consumo coperta senza prelevare dalla rete. */
export const selfSufficiency = (d: DayTotals) => (d.home > 0 ? Math.max(0, Math.min(1, 1 - d.gridIn / d.home)) : null);
