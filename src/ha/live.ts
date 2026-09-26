import {
  type AuthData,
  type Connection,
  createConnection,
  ERR_INVALID_AUTH,
  getAuth,
  subscribeEntities,
} from 'home-assistant-js-websocket';
import type {
  AreaEntry, DeviceEntry, EntityEntry, ForecastItem, HaSource, HaUser,
  Registries, StatPeriod, StatRow, StatType, TodoItem,
} from './types';

// Autenticazione nativa di Home Assistant (OAuth2 con codice di autorizzazione).
// I token ottenuti dal login restano nel localStorage di questo browser:
// nessun token e presente nel codice o nel repository.
const TOKEN_KEY = 'casa-mobile.auth';

/** L'app e sempre servita dalla stessa origine di HA (proxy in sviluppo, /local in produzione). */
const hassUrl = () => window.location.origin;

const saveTokens = (data: AuthData | null) => {
  try {
    if (data) localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage non disponibile: il login varra solo per questa sessione */
  }
};

const loadTokens = async (): Promise<AuthData | null> => {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as AuthData) : null;
  } catch {
    return null;
  }
};

const isAuthCallback = () => new URLSearchParams(window.location.search).has('auth_callback');

/** Vero se esiste gia una sessione o se stiamo tornando dalla pagina di login di HA. */
export async function hasSession(): Promise<boolean> {
  return isAuthCallback() || (await loadTokens()) !== null;
}

/** Porta il browser alla pagina di login di Home Assistant. */
export function startLogin(): void {
  void getAuth({ hassUrl: hassUrl(), saveTokens, loadTokens, limitHassInstance: true });
}

export class SessionExpiredError extends Error {}

export async function connectLive(): Promise<HaSource> {
  const auth = await getAuth({ hassUrl: hassUrl(), saveTokens, loadTokens, limitHassInstance: true });
  if (isAuthCallback()) {
    // Rimuove codice e stato OAuth dall'indirizzo, mantenendo la rotta corrente.
    history.replaceState(history.state, '', window.location.pathname + window.location.hash);
  }
  let conn: Connection;
  try {
    conn = await createConnection({ auth });
  } catch (err) {
    if (err === ERR_INVALID_AUTH) {
      saveTokens(null);
      throw new SessionExpiredError('Sessione scaduta');
    }
    throw err;
  }

  const [user, areas, devices, entities] = await Promise.all([
    conn.sendMessagePromise<HaUser>({ type: 'auth/current_user' }),
    conn.sendMessagePromise<AreaEntry[]>({ type: 'config/area_registry/list' }),
    conn.sendMessagePromise<DeviceEntry[]>({ type: 'config/device_registry/list' }),
    conn.sendMessagePromise<{ entities: EntityEntry[] }>({ type: 'config/entity_registry/list_for_display' }),
  ]);
  const registries: Registries = { areas, devices, entities: entities.entities };

  const source: HaSource = {
    kind: 'live',
    user,
    registries,
    now: () => Date.now(),
    subscribeStates: (cb) => subscribeEntities(conn, cb),
    onConnectionChange(cb) {
      const ready = () => cb('ready');
      const lost = () => cb('reconnecting');
      conn.addEventListener('ready', ready);
      conn.addEventListener('disconnected', lost);
      return () => {
        conn.removeEventListener('ready', ready);
        conn.removeEventListener('disconnected', lost);
      };
    },
    async statistics(ids: string[], period: StatPeriod, startMs: number, types: StatType[]) {
      return conn.sendMessagePromise<Record<string, StatRow[]>>({
        type: 'recorder/statistics_during_period',
        start_time: new Date(startMs).toISOString(),
        statistic_ids: ids,
        period,
        types,
      });
    },
    subscribeForecast(entityId, cb) {
      const unsub = conn.subscribeMessage<{ forecast: ForecastItem[] | null }>(
        (msg) => cb(msg.forecast ?? []),
        { type: 'weather/subscribe_forecast', entity_id: entityId, forecast_type: 'daily' },
      );
      return () => void unsub.then((u) => u()).catch(() => undefined);
    },
    subscribeTodo(entityId, cb) {
      const unsub = conn.subscribeMessage<{ items: TodoItem[] }>(
        (msg) => cb(msg.items ?? []),
        { type: 'todo/item/subscribe', entity_id: entityId },
      );
      return () => void unsub.then((u) => u()).catch(() => undefined);
    },
    async logout() {
      try {
        await auth.revoke();
      } finally {
        saveTokens(null);
        conn.close();
      }
    },
  };
  return source;
}
