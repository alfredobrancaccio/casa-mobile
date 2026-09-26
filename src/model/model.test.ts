// Test della logica pura: profili, capability, freschezza, modello casa, comandi, energia.
// Le fixture sono minime e sintetiche: servono solo a verificare le regole.
import { describe, expect, it } from 'vitest';
import { buildCall } from '../ha/commands';
import type { HassEntities, HassEntity, Registries } from '../ha/types';
import { dailyTotals } from './energy';
import { cleanName, isFresh } from './entity';
import { buildHouse } from './house';
import { findCapability, readPersonal, resolveProfile } from './profile';
import { securityReport } from './status';

const NOW = Date.parse('2026-09-26T10:00:00Z');
const ago = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

function st(entity_id: string, state: string, attributes: Record<string, unknown> = {}, ageH = 0.1): HassEntity {
  return {
    entity_id, state, attributes, last_changed: ago(ageH), last_updated: ago(ageH),
    context: { id: '', parent_id: null, user_id: null },
  };
}
const states = (...list: HassEntity[]): HassEntities => Object.fromEntries(list.map((s) => [s.entity_id, s]));

describe('identita', () => {
  it('associa ogni account al suo profilo', () => {
    expect(resolveProfile('4aca2dbb466545c7bda8975b6d57c0b3').id).toBe('alfredo');
    expect(resolveProfile('0f5c0e43223c40c285f9a13c92ea97d0').id).toBe('giacomo');
    expect(resolveProfile('0ea5b542caac4d4191f9030ee9ba2b32').id).toBe('elisabetta');
    expect(resolveProfile('3291eeec7ccc40a9b352eb8386cf6de8').id).toBe('salvatore');
  });
  it('tablet, Pikko e account sconosciuti usano il profilo neutro Casa', () => {
    expect(resolveProfile('476e201077034884ba4e8890a3875ab0').id).toBe('casa');
    expect(resolveProfile('9f4f9566bec9498e8aedd51df1ec398c').id).toBe('casa');
    expect(resolveProfile('sconosciuto').id).toBe('casa');
    expect(resolveProfile(undefined).id).toBe('casa');
  });
});

describe('capability dei dispositivi personali', () => {
  const phone = { key: 'phone', role: 'phone' as const, label: 'Tel', primary: true, haDeviceId: 'dev1' };
  const entities = [
    { ei: 'sensor.tel_battery_level', pl: 'mobile_app', di: 'dev1' },
    { ei: 'sensor.tel_battery_state', pl: 'mobile_app', di: 'dev1' },
    { ei: 'device_tracker.tel', pl: 'mobile_app', di: 'dev1' },
    { ei: 'sensor.tel_steps', pl: 'mobile_app', di: 'dev1' },
  ];

  it('usa solo dati disponibili e recenti', () => {
    const s = states(
      st('sensor.tel_battery_level', '42', { device_class: 'battery' }, 1),
      st('sensor.tel_steps', 'unavailable'),
      st('device_tracker.tel', 'home', {}, 30), // piu vecchio di 24 h
    );
    expect(findCapability(phone, 'battery', entities, s, NOW)?.state).toBe('42');
    expect(findCapability(phone, 'steps', entities, s, NOW)).toBeNull();
    expect(findCapability(phone, 'tracker', entities, s, NOW)).toBeNull();
  });

  it('riconosce la ricarica su Android e iOS', () => {
    for (const [raw, expected] of [['charging', true], ['Charging', true], ['Full', true], ['Not Charging', false], ['discharging', false]] as const) {
      const s = states(st('sensor.tel_battery_state', raw));
      expect(readPersonal(phone, entities, s, NOW).charging).toBe(expected);
    }
  });

  it('ignora i dispositivi legacy', () => {
    const legacy = { ...phone, haDeviceId: '0b95b4a2aa93141f273658f419733465' };
    const s = states(st('sensor.tel_battery_level', '90', { device_class: 'battery' }));
    const ents = entities.map((e) => ({ ...e, di: legacy.haDeviceId }));
    expect(findCapability(legacy, 'battery', ents, s, NOW)).toBeNull();
  });

  it('senza dati non produce voci vuote', () => {
    const data = readPersonal(phone, entities, {}, NOW);
    expect(Object.keys(data)).toEqual(['device']);
  });
});

describe('freschezza e nomi', () => {
  it('isFresh esclude unknown e dati vecchi', () => {
    expect(isFresh(st('sensor.x', '1', {}, 2), NOW, 3)).toBe(true);
    expect(isFresh(st('sensor.x', '1', {}, 4), NOW, 3)).toBe(false);
    expect(isFresh(st('sensor.x', 'unknown'), NOW, 3)).toBe(false);
  });
  it('cleanName rimuove duplicati e nome della stanza', () => {
    expect(cleanName('Faretti Alfredo Faretti Alfredo')).toBe('Faretti Alfredo');
    expect(cleanName('Cucina Faretti', 'Cucina')).toBe('Faretti');
    expect(cleanName('Cucina', 'Cucina')).toBe('Cucina');
  });
});

describe('modello della casa', () => {
  const reg: Registries = {
    areas: [
      { area_id: 'cucina', name: 'Cucina' },
      { area_id: 'ingresso', name: 'Ingresso' },
      { area_id: 'corriodio_ragazzi', name: 'Corridoio ragazzi' },
      { area_id: 'etere', name: 'Etere' },
    ],
    devices: [{ id: 'd1', name: 'X', name_by_user: null, area_id: 'cucina' }],
    entities: [
      { ei: 'light.cucina_faretti', pl: 'mqtt', ai: 'cucina', en: 'Cucina Faretti' },
      { ei: 'cover.balcone_cucina', pl: 'mqtt', ai: 'cucina', hb: true, en: 'Balcone Cucina' },
      { ei: 'switch.nascosto', pl: 'tuya', ai: 'cucina', hb: true },
      { ei: 'switch.config', pl: 'tuya', ai: 'cucina', ec: 0 },
      { ei: 'light.scrivania_2', pl: 'alexa_media', ai: 'cucina' },
      { ei: 'binary_sensor.door_sensor_7_porta', pl: 'tuya', ai: 'ingresso' },
      { ei: 'sensor.tdeg_rilevata_tdeg_rilevata', pl: 'mqtt', ai: 'etere' },
      { ei: 'switch.cc_aria_condizionata_cc_aria_condizionata', pl: 'mqtt', ai: 'etere' },
    ],
  };
  const s = states(
    st('light.cucina_faretti', 'on'),
    st('cover.balcone_cucina', 'open'),
    st('switch.nascosto', 'off'),
    st('switch.config', 'off'),
    st('light.scrivania_2', 'off'),
    st('binary_sensor.door_sensor_7_porta', 'on', { device_class: 'door' }),
    st('sensor.tdeg_rilevata_tdeg_rilevata', '27', { device_class: 'temperature' }),
    st('switch.cc_aria_condizionata_cc_aria_condizionata', 'off'),
  );
  const house = buildHouse(reg, s);

  it('applica policy: duplicati, nascoste e configurazione escluse; tapparelle incluse', () => {
    expect(house.byId.has('light.cucina_faretti')).toBe(true);
    expect(house.byId.get('light.cucina_faretti')!.name).toBe('Faretti');
    expect(house.byId.has('cover.balcone_cucina')).toBe(true);
    expect(house.byId.has('switch.nascosto')).toBe(false);
    expect(house.byId.has('switch.config')).toBe(false);
    expect(house.byId.has('light.scrivania_2')).toBe(false);
  });

  it("l'area tecnica non e una stanza e fornisce solo impianto", () => {
    expect(house.rooms.some((r) => r.id === 'etere')).toBe(false);
    expect(house.byId.has('sensor.tdeg_rilevata_tdeg_rilevata')).toBe(false);
    expect(house.byId.get('switch.cc_aria_condizionata_cc_aria_condizionata')?.areaId).toBe('etere');
  });

  it('alsoShowIn mostra la porta anche nel corridoio senza cambiarne l’area', () => {
    const corridor = house.rooms.find((r) => r.id === 'corriodio_ragazzi')!;
    expect(corridor.related.map((e) => e.id)).toContain('binary_sensor.door_sensor_7_porta');
    expect(house.byId.get('binary_sensor.door_sensor_7_porta')!.areaId).toBe('ingresso');
  });

  it('i sensori inaffidabili non generano segnalazioni ma compaiono tra le anomalie', () => {
    const r = securityReport(house, s);
    expect(r.openPerimeter).toHaveLength(0);
    expect(r.badge).toBe(0);
    expect(r.anomalies.map((a) => a.info.id)).toContain('binary_sensor.door_sensor_7_porta');
  });
});

describe('comandi', () => {
  it('traduce le azioni nelle chiamate di servizio di HA', () => {
    expect(buildCall('light.a', { type: 'toggle' })).toEqual({ domain: 'light', service: 'toggle', target: { entity_id: 'light.a' } });
    expect(buildCall('light.a', { type: 'brightness', percent: 140 }).data).toEqual({ brightness_pct: 100 });
    expect(buildCall('cover.a', { type: 'coverStop' }).service).toBe('stop_cover');
    expect(buildCall('climate.a', { type: 'climateTarget', temperature: 20 }).data).toEqual({ temperature: 20 });
    expect(buildCall('scene.a', { type: 'activate' })).toMatchObject({ domain: 'scene', service: 'turn_on' });
  });
});

describe('energia', () => {
  it('calcola il consumo giornaliero dai contatori', () => {
    const day = (change: number) => [{ start: 1, end: 2, change }];
    const [d] = dailyTotals({
      'sensor.tesla_powerwall_importa_sito': day(2),
      'sensor.tesla_powerwall_esporta_sito': day(1),
      'sensor.tesla_powerwall_esporta_solare': day(10),
      'sensor.tesla_powerwall_esporta_batteria': day(3),
      'sensor.tesla_powerwall_importa_batteria': day(4),
    });
    expect(d.home).toBe(10); // 2 + 10 + 3 − 1 − 4
  });
});
