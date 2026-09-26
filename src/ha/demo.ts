// SOLO SVILUPPO. Questo modulo viene importato dinamicamente dietro `import.meta.env.DEV`
// e non entra nella build di produzione.
//
// Legge l'istantanea REALE e ripulita creata da `tools/make_snapshot.py` (sola lettura su HA)
// e la espone con la stessa interfaccia della sorgente reale. Serve a sviluppare e verificare
// la UI senza effettuare il login con le credenziali degli utenti.
import type {
  AreaEntry, DeviceEntry, EntityEntry, ForecastItem, HaSource, HaUser, HassEntities, HassEntity, StatRow, TodoItem,
} from './types';

interface Snapshot {
  captured_at: string;
  areas: AreaEntry[];
  devices: DeviceEntry[];
  entities: { entities: EntityEntry[] };
  states: HassEntity[];
  statistics: { hour: Record<string, StatRow[]>; day: Record<string, StatRow[]> };
  forecast: Record<string, { daily: ForecastItem[] }>;
  todo?: Record<string, TodoItem[]>;
}

export async function connectDemo(user: HaUser): Promise<HaSource> {
  const res = await fetch('/dev-data/snapshot.json', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Istantanea assente: esegui "py tools/make_snapshot.py --token-file <file>".');
  }
  const snap = (await res.json()) as Snapshot;
  const capturedAt = Date.parse(snap.captured_at);
  const states: HassEntities = Object.fromEntries(
    snap.states.map((s) => [s.entity_id, { ...s, context: { id: '', parent_id: null, user_id: null } }]),
  );

  return {
    kind: 'demo',
    user,
    registries: { areas: snap.areas, devices: snap.devices, entities: snap.entities.entities },
    now: () => capturedAt,
    subscribeStates(cb) {
      cb(states);
      return () => undefined;
    },
    onConnectionChange(cb) {
      cb('ready');
      return () => undefined;
    },
    async statistics(ids, period, startMs) {
      const table = snap.statistics[period] ?? {};
      return Object.fromEntries(ids.map((id) => [id, (table[id] ?? []).filter((r) => r.start >= startMs)]));
    },
    subscribeForecast(entityId, cb) {
      cb(snap.forecast[entityId]?.daily ?? []);
      return () => undefined;
    },
    subscribeTodo(entityId, cb) {
      cb(snap.todo?.[entityId] ?? []);
      return () => undefined;
    },
    async logout() {
      /* nessuna sessione da chiudere */
    },
  };
}
