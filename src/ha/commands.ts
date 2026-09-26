// LIVELLO COMANDI
//
// Ogni azione della UI diventa una chiamata di servizio descritta in modo esplicito
// (dominio, servizio, entita, dati) e passa da un unico gateway.
//
// In questa versione il gateway e DISATTIVATO: la dashboard e in sola lettura.
// Nessun `call_service` viene inviato a Home Assistant. Per attivare i controlli
// servira un gateway che inoltri `ServiceCall` alla connessione autenticata:
// questa modifica richiede un'autorizzazione esplicita.
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

export type CommandResult = { ok: true } | { ok: false; reason: 'read-only' | 'error'; message: string };

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
