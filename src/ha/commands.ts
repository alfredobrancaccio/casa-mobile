// LIVELLO COMANDI
//
// Ogni azione della UI diventa una chiamata di servizio descritta in modo esplicito
// (dominio, servizio, entita, dati) e passa da un unico gateway.
//
// Con la sorgente reale il gateway inoltra `call_service` alla connessione WebSocket
// gia autenticata con l'account dell'utente. Con l'istantanea di sviluppo resta in sola lettura.
// Sono ammessi solo i domini che la UI sa controllare: allarme, serrature e simili
// restano esclusi (richiedono una gestione separata, ad esempio con PIN).
import type { HassEntity } from './types';
import { domainOf } from '../model/entity';

export interface ServiceCall {
  domain: string;
  service: string;
  target: { entity_id: string };
  data?: Record<string, unknown>;
}

export type Action =
  | { type: 'toggle' }
  | { type: 'turnOn' }
  | { type: 'turnOff' }
  | { type: 'brightness'; percent: number }
  | { type: 'coverOpen' }
  | { type: 'coverClose' }
  | { type: 'coverStop' }
  | { type: 'coverPosition'; position: number }
  | { type: 'climateTarget'; temperature: number }
  | { type: 'climateMode'; mode: string }
  | { type: 'mediaPlayPause' }
  | { type: 'volumeUp' }
  | { type: 'volumeDown' }
  | { type: 'activate' };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Traduce un'azione della UI nella chiamata di servizio corrispondente di Home Assistant. */
export function buildCall(entityId: string, action: Action): ServiceCall {
  const domain = domainOf(entityId);
  const target = { entity_id: entityId };
  const call = (service: string, data?: Record<string, unknown>, svcDomain = domain): ServiceCall =>
    data ? { domain: svcDomain, service, target, data } : { domain: svcDomain, service, target };

  switch (action.type) {
    case 'toggle':
      return call('toggle');
    case 'turnOn':
      return call('turn_on');
    case 'turnOff':
      return call('turn_off');
    case 'brightness':
      return call('turn_on', { brightness_pct: clamp(Math.round(action.percent), 1, 100) }, 'light');
    case 'coverOpen':
      return call('open_cover', undefined, 'cover');
    case 'coverClose':
      return call('close_cover', undefined, 'cover');
    case 'coverStop':
      return call('stop_cover', undefined, 'cover');
    case 'coverPosition':
      return call('set_cover_position', { position: clamp(Math.round(action.position), 0, 100) }, 'cover');
    case 'climateTarget':
      return call('set_temperature', { temperature: action.temperature }, 'climate');
    case 'climateMode':
      return call('set_hvac_mode', { hvac_mode: action.mode }, 'climate');
    case 'mediaPlayPause':
      return call('media_play_pause', undefined, 'media_player');
    case 'volumeUp':
      return call('volume_up', undefined, 'media_player');
    case 'volumeDown':
      return call('volume_down', undefined, 'media_player');
    case 'activate':
      return call('turn_on', undefined, 'scene');
  }
}

export type CommandResult =
  | { ok: true }
  | { ok: false; reason: 'read-only' | 'unavailable' | 'error'; message: string };

export interface CommandGateway {
  readonly enabled: boolean;
  execute(call: ServiceCall): Promise<CommandResult>;
}

/** Gateway attuale: nessun comando lascia il browser. */
export const readOnlyGateway: CommandGateway = {
  enabled: false,
  async execute(call) {
    console.info('[casa-mobile] sola lettura, comando NON inviato:', call);
    return { ok: false, reason: 'read-only', message: 'Controlli non ancora attivi' };
  },
};

/** Domini per cui la UI prevede controlli. Tutto il resto viene rifiutato prima dell'invio. */
export const CONTROLLABLE_DOMAINS: ReadonlySet<string> = new Set([
  'light', 'switch', 'fan', 'valve', 'cover', 'climate', 'media_player', 'scene',
]);

/** Errore restituito da Home Assistant (`{ code, message }`) o codice numerico della libreria. */
function describeFailure(err: unknown): string {
  if (err === 3) return 'Connessione a Home Assistant persa: riprova';
  if (err && typeof err === 'object') {
    const { code, message } = err as { code?: unknown; message?: unknown };
    if (code === 'not_found') return 'Servizio non disponibile in Home Assistant';
    if (code === 'unauthorized') return 'Account non autorizzato per questo comando';
    if (typeof message === 'string' && message) return message;
  }
  return 'Comando non riuscito';
}

/**
 * Gateway reale: verifica dominio e disponibilita dell'entita, poi invia il comando.
 * `send` e la `call_service` della connessione autenticata; `stateOf` legge lo stato corrente.
 */
export function createLiveGateway(
  send: (call: ServiceCall) => Promise<unknown>,
  stateOf: (entityId: string) => HassEntity | undefined,
): CommandGateway {
  return {
    enabled: true,
    async execute(call) {
      const entityId = call.target.entity_id;
      if (!CONTROLLABLE_DOMAINS.has(call.domain) || !CONTROLLABLE_DOMAINS.has(domainOf(entityId))) {
        return { ok: false, reason: 'error', message: 'Comando non consentito da questa app' };
      }
      const s = stateOf(entityId);
      if (!s) return { ok: false, reason: 'unavailable', message: 'Dispositivo non trovato in Home Assistant' };
      if (s.state === 'unavailable') return { ok: false, reason: 'unavailable', message: 'Dispositivo non raggiungibile' };
      try {
        await send(call);
        return { ok: true };
      } catch (err) {
        console.warn('[casa-mobile] comando non riuscito:', call, err);
        return { ok: false, reason: 'error', message: describeFailure(err) };
      }
    },
  };
}
