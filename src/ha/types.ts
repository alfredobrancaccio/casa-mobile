import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import type { ServiceCall } from './commands';

export type { HassEntities, HassEntity };

export interface HaUser {
  id: string;
  name: string;
  is_admin: boolean;
  is_owner: boolean;
}

export interface AreaEntry {
  area_id: string;
  name: string;
  icon?: string | null;
}

export interface DeviceEntry {
  id: string;
  name: string | null;
  name_by_user: string | null;
  area_id: string | null;
  manufacturer?: string | null;
  model?: string | null;
}

/** Formato compatto di `config/entity_registry/list_for_display`. */
export interface EntityEntry {
  ei: string; // entity_id
  pl: string; // platform
  ai?: string; // area_id propria dell'entita
  di?: string; // device_id
  ec?: number; // entity_category (indice in entity_categories)
  hb?: boolean; // nascosta
  en?: string; // nome dell'entita
  hn?: boolean; // has_entity_name
}

export interface Registries {
  areas: AreaEntry[];
  devices: DeviceEntry[];
  entities: EntityEntry[];
}

export interface StatRow {
  start: number;
  end: number;
  mean?: number | null;
  min?: number | null;
  max?: number | null;
  change?: number | null;
}

export type StatPeriod = 'hour' | 'day';
export type StatType = 'mean' | 'min' | 'max' | 'change';

export interface ForecastItem {
  datetime: string;
  condition?: string;
  temperature?: number;
  templow?: number;
  precipitation?: number;
}

export interface TodoItem {
  uid: string;
  summary: string;
  status: 'needs_action' | 'completed';
}

export type ConnectionState = 'connecting' | 'ready' | 'reconnecting';

/**
 * Sorgente dei dati di Home Assistant. L'app usa solo questa interfaccia:
 * la sorgente reale (WebSocket autenticata) e l'istantanea di sviluppo la implementano.
 */
export interface HaSource {
  readonly kind: 'live' | 'demo';
  readonly user: HaUser;
  readonly registries: Registries;
  /** Ora di riferimento per la freschezza dei dati (in demo e l'ora dell'istantanea). */
  now(): number;
  subscribeStates(cb: (states: HassEntities) => void): () => void;
  onConnectionChange(cb: (state: ConnectionState) => void): () => void;
  statistics(ids: string[], period: StatPeriod, startMs: number, types: StatType[]): Promise<Record<string, StatRow[]>>;
  subscribeForecast(entityId: string, cb: (items: ForecastItem[]) => void): () => void;
  /** Elementi di una lista (todo.*), aggiornati in tempo reale. Sola lettura. */
  subscribeTodo(entityId: string, cb: (items: TodoItem[]) => void): () => void;
  /** Invia una chiamata di servizio. Assente nell'istantanea di sviluppo (sola lettura). */
  callService?(call: ServiceCall): Promise<unknown>;
  logout(): Promise<void>;
}
