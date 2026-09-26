// Stato globale dell'app (signals). La UI legge da qui; solo qui si parla con la sorgente HA.
import { computed, signal } from '@preact/signals';
import { type Action, buildCall, type CommandGateway, createLiveGateway, readOnlyGateway } from '../ha/commands';
import { connectLive, hasSession, SessionExpiredError } from '../ha/live';
import type { ConnectionState, ForecastItem, HaSource, HassEntities } from '../ha/types';
import { HOUSE } from '../config/house';
import { FALLBACK_PROFILE_ID, PROFILES } from '../config/profiles';
import { buildHouse } from '../model/house';
import { resolveProfile } from '../model/profile';

export type Phase =
  | { kind: 'boot' }
  | { kind: 'login'; expired?: boolean }
  | { kind: 'error'; message: string }
  | { kind: 'ready' };

export const phase = signal<Phase>({ kind: 'boot' });
export const source = signal<HaSource | null>(null);
export const states = signal<HassEntities>({});
export const connection = signal<ConnectionState>('connecting');
export const forecast = signal<ForecastItem[]>([]);

const clock = signal(Date.now());
setInterval(() => (clock.value = Date.now()), 30_000);
/** Ora di riferimento: reale, oppure quella dell'istantanea in modalita demo. */
export const now = computed(() => (source.value?.kind === 'demo' ? source.value.now() : clock.value));

// La struttura della casa si ricostruisce solo quando cambia l'insieme delle entita,
// non a ogni aggiornamento di stato.
const structureKey = signal('');
export const house = computed(() => {
  void structureKey.value;
  const src = source.value;
  return src ? buildHouse(src.registries, states.peek()) : null;
});

export const profile = computed(() => resolveProfile(source.value?.user.id));

// ---------------------------------------------------------------------------
// Avvio

export async function boot(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  try {
    if (import.meta.env.DEV && params.has('demo')) {
      const { connectDemo } = await import('../ha/demo');
      const p = PROFILES.find((x) => x.id === params.get('demo')) ?? PROFILES.find((x) => x.id === FALLBACK_PROFILE_ID)!;
      await start(await connectDemo({ id: p.haUserIds[0], name: p.displayName ?? 'Casa', is_admin: false, is_owner: false }));
      return;
    }
    if (!(await hasSession())) {
      phase.value = { kind: 'login' };
      return;
    }
    await start(await connectLive());
  } catch (err) {
    if (err instanceof SessionExpiredError) phase.value = { kind: 'login', expired: true };
    else phase.value = { kind: 'error', message: describeError(err) };
  }
}

async function start(src: HaSource): Promise<void> {
  source.value = src;
  src.onConnectionChange((s) => (connection.value = s));
  src.subscribeForecast(HOUSE.weather, (items) => (forecast.value = items));
  await new Promise<void>((resolve) => {
    src.subscribeStates((next) => {
      states.value = next;
      const key = `${Object.keys(next).length}`;
      if (key !== structureKey.value) structureKey.value = key;
      resolve();
    });
  });
  connection.value = 'ready';
  phase.value = { kind: 'ready' };
}

export async function logout(): Promise<void> {
  await source.value?.logout();
  window.location.hash = '';
  window.location.reload();
}

function describeError(err: unknown): string {
  if (err === 1) return 'Home Assistant non raggiungibile. Controlla la connessione alla rete di casa.';
  if (err instanceof Error) return err.message;
  return 'Errore imprevisto durante la connessione.';
}

// ---------------------------------------------------------------------------
// Comandi e notifiche

export interface Toast {
  id: number;
  text: string;
  tone: 'neutral' | 'error';
}

export const toasts = signal<Toast[]>([]);
let toastSeq = 0;

export function notify(text: string, tone: Toast['tone'] = 'neutral'): void {
  const id = ++toastSeq;
  toasts.value = [...toasts.value.slice(-2), { id, text, tone }];
  setTimeout(() => (toasts.value = toasts.value.filter((t) => t.id !== id)), 3500);
}

// Con la connessione reale i comandi vanno a Home Assistant; con l'istantanea restano in sola lettura.
const gateway = computed<CommandGateway>(() => {
  const send = source.value?.callService;
  return send ? createLiveGateway(send, (id) => states.peek()[id]) : readOnlyGateway;
});
export const controlsEnabled = computed(() => gateway.value.enabled);

/** Unico punto da cui la UI invia azioni verso Home Assistant. */
export async function run(entityId: string, action: Action): Promise<void> {
  const result = await gateway.value.execute(buildCall(entityId, action));
  if (!result.ok) {
    notify(result.reason === 'read-only' ? 'Sola lettura: comando non inviato' : result.message,
      result.reason === 'read-only' ? 'neutral' : 'error');
  }
}
