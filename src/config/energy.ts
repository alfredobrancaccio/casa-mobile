// Sorgenti energetiche. Una sola entita per grandezza: gli equivalenti
// (sensor.casa_consumo, sensor.pw_*) non vengono usati per evitare doppioni.

/** Potenze istantanee dei quattro nodi (Tesla Powerwall). */
export const POWER = {
  solar: 'sensor.tesla_powerwall_potenza_solare',
  grid: 'sensor.tesla_powerwall_potenza_del_sito', // > 0 prelievo, < 0 immissione
  battery: 'sensor.tesla_powerwall_potenza_della_batteria', // > 0 scarica, < 0 carica
  home: 'sensor.tesla_powerwall_potenza_di_carico',
};

export const BATTERY = {
  charge: 'sensor.tesla_powerwall_carica',
  reserve: 'sensor.tesla_powerwall_riserva_di_backup',
  gridUp: 'binary_sensor.tesla_powerwall_stato_della_rete',
};

export type EnergyNode = 'solar' | 'grid' | 'battery' | 'home';

/** Flussi tra i nodi (sensori template gia presenti in HA, in W). */
export const FLOWS: { from: EnergyNode; to: EnergyNode; entity: string }[] = [
  { from: 'solar', to: 'home', entity: 'sensor.flusso_solare_casa' },
  { from: 'solar', to: 'battery', entity: 'sensor.flusso_solare_powerwall' },
  { from: 'solar', to: 'grid', entity: 'sensor.flusso_solare_rete' },
  { from: 'grid', to: 'home', entity: 'sensor.flusso_rete_casa' },
  { from: 'grid', to: 'battery', entity: 'sensor.flusso_rete_powerwall' },
  { from: 'battery', to: 'home', entity: 'sensor.flusso_powerwall_casa' },
  { from: 'battery', to: 'grid', entity: 'sensor.flusso_powerwall_rete' },
];

/** Contatori cumulativi (statistiche a lungo termine), come nel pannello Energia di HA. */
export const COUNTERS = {
  gridIn: 'sensor.tesla_powerwall_importa_sito',
  gridOut: 'sensor.tesla_powerwall_esporta_sito',
  solar: 'sensor.tesla_powerwall_esporta_solare',
  batteryOut: 'sensor.tesla_powerwall_esporta_batteria',
  batteryIn: 'sensor.tesla_powerwall_importa_batteria',
};

/** Misure di rete Dovit: dettaglio tecnico. */
export const GRID_METER = {
  voltage: 'sensor.tensione_tensione',
  frequency: 'sensor.frequenza_frequenza',
};
