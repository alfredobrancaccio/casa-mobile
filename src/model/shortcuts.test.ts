// Scorciatoie: si verificano i TARGET reali (entity_id e area risolta), non le etichette.
import { describe, expect, it } from 'vitest';
import { PROFILES } from '../config/profiles';
import type { AreaEntry, DeviceEntry, EntityEntry, HassEntities, HassEntity, Registries } from '../ha/types';
import { canAreaAppearInShortcuts, isAreaPrivateForOtherUser, primaryArea, resolveEntityArea } from './areaPolicy';
import { buildHouse, type House } from './house';
import { resolveProfile } from './profile';
import { generateShortcuts, MAX_SHORTCUTS, type ResolvedShortcut, shortcutSubtitle } from './shortcuts';

const profile = (id: string) => PROFILES.find((p) => p.id === id)!;

const FORBIDDEN: Record<string, string[]> = {
  alfredo: ['camera_giacomo', 'camera_da_letto', 'bagno_padronale'],
  giacomo: ['camera_alfredo', 'camera_da_letto', 'bagno_padronale'],
  elisabetta: ['camera_alfredo', 'camera_giacomo', 'bagno_ragazzi', 'corriodio_ragazzi'],
  salvatore: ['camera_alfredo', 'camera_giacomo', 'bagno_ragazzi', 'corriodio_ragazzi'],
  casa: ['camera_alfredo', 'camera_giacomo', 'camera_da_letto', 'bagno_padronale', 'bagno_ragazzi', 'corriodio_ragazzi'],
};

const st = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => ({
  entity_id, state, attributes, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null },
});

/** Nomi delle aree come in Home Assistant. */
const AREA_NAMES: Record<string, string> = {
  camera_alfredo: 'Camera Alfredo', camera_giacomo: 'Camera Giacomo', camera_da_letto: 'Camera Padronale',
  bagno_padronale: 'Bagno padronale', bagno_ragazzi: 'Bagno ragazzi', corriodio_ragazzi: 'Corridoio ragazzi',
  soggiorno: 'Soggiorno', cucina: 'Cucina', ingresso: 'Ingresso', balconi: 'Balconi',
};

/**
 * Casa sintetica con gli stessi nomi in stanze diverse (es. "Faretti" in ogni camera),
 * un dispositivo con area diversa dalla sua entita e un'entita senza area.
 */
function fixture() {
  const areas: AreaEntry[] = [
    'camera_alfredo', 'camera_giacomo', 'camera_da_letto', 'bagno_padronale', 'bagno_ragazzi', 'corriodio_ragazzi',
    'soggiorno', 'cucina', 'ingresso', 'balconi', 'bagno_servizio', 'camera_servizio', 'etere',
  ].map((area_id) => ({ area_id, name: AREA_NAMES[area_id] ?? area_id }));
  const devices: DeviceEntry[] = [
    // dispositivo assegnato a Camera Alfredo, ma la sua entita e in Camera Giacomo: vince l'entita
    { id: 'dev_alfredo', name: 'X', name_by_user: null, area_id: 'camera_alfredo' },
    { id: 'dev_tv_giacomo', name: 'TV', name_by_user: null, area_id: 'camera_giacomo' },
  ];
  const e = (ei: string, ai?: string, di?: string): EntityEntry => ({ ei, pl: 'mqtt', ai, di });
  const entities: EntityEntry[] = [
    e('light.faretti_alfredo', 'camera_alfredo'),
    e('light.atmosfera_alfredo', 'camera_alfredo'),
    e('cover.balcone_alfredo', 'camera_alfredo'),
    e('climate.termosifone_alfredo', undefined, 'dev_alfredo'),
    e('light.faretti_giacomo', 'camera_giacomo', 'dev_alfredo'),
    e('light.giacomo_led_letto', 'camera_giacomo'),
    e('cover.finestra_giacomo', 'camera_giacomo'),
    e('media_player.fire_tv_di_giacomo_alexa', undefined, 'dev_tv_giacomo'),
    e('light.camera_padronale_faretti', 'camera_da_letto'),
    e('light.bagno_padr_luce_centro', 'bagno_padronale'),
    e('light.bagno_ragazzi_faretti', 'bagno_ragazzi'),
    e('light.corridoio_faretti', 'corriodio_ragazzi'),
    e('light.luce_pranzo', 'soggiorno'),
    e('light.cucina_faretti', 'cucina'),
    e('light.orfana'), // nessuna area: non deve finire in nessuna stanza
  ];
  const states: HassEntities = Object.fromEntries(
    [
      ...entities.map((x) => st(x.ei, 'off', x.ei.startsWith('media_player') ? { device_class: 'tv' } : {})),
      st('cover.tutte_le_tapparelle', 'open'),
    ].map((s) => [s.entity_id, s]),
  );
  const reg: Registries = { areas, devices, entities };
  return { reg, states, house: buildHouse(reg, states) };
}

function assertSafe(house: House, profileId: string, list: ResolvedShortcut[]) {
  const ids = list.map((s) => (s.kind === 'entity' ? s.id : `cat:${s.id}`));
  expect(new Set(ids).size).toBe(ids.length); // nessun duplicato
  expect(list.length).toBeLessThanOrEqual(MAX_SHORTCUTS);
  for (const s of list) {
    if (s.kind !== 'entity') continue;
    const info = house.byId.get(s.id)!;
    expect(info, s.id).toBeDefined(); // il target esiste
    expect(s.areaId).toBe(info.areaId); // area dichiarata = area risolta del target
    expect(FORBIDDEN[profileId]).not.toContain(info.areaId);
    expect(isAreaPrivateForOtherUser(info.areaId, profileId)).toBe(false);
    expect(canAreaAppearInShortcuts(info.areaId, profileId)).toBe(true);
  }
}

describe('risoluzione dell’area', () => {
  it('l’area dell’entita prevale su quella del dispositivo', () => {
    expect(resolveEntityArea({ ei: 'light.x', ai: 'camera_giacomo' }, { area_id: 'camera_alfredo' })).toBe('camera_giacomo');
  });
  it('senza area propria si usa quella del dispositivo', () => {
    expect(resolveEntityArea({ ei: 'light.x' }, { area_id: 'cucina' })).toBe('cucina');
  });
  it('l’override vale solo per entita senza alcuna area', () => {
    const o = { 'light.x': 'soggiorno' };
    expect(resolveEntityArea({ ei: 'light.x' }, undefined, o)).toBe('soggiorno');
    expect(resolveEntityArea({ ei: 'light.x' }, { area_id: 'cucina' }, o)).toBe('cucina');
    expect(resolveEntityArea({ ei: 'light.x', ai: 'ingresso' }, { area_id: 'cucina' }, o)).toBe('ingresso');
  });
  it('senza area e senza override: nessuna area (mai una stanza personale di default)', () => {
    expect(resolveEntityArea({ ei: 'light.x' }, undefined, {})).toBeNull();
    expect(resolveEntityArea({ ei: 'light.x' }, { area_id: null }, {})).toBeNull();
    const { house } = fixture();
    expect(house.byId.has('light.orfana')).toBe(false);
  });
  it('nel modello un’entita Giacomo su dispositivo Alfredo resta di Giacomo', () => {
    const { house } = fixture();
    expect(house.byId.get('light.faretti_giacomo')!.areaId).toBe('camera_giacomo');
    expect(house.byId.get('climate.termosifone_alfredo')!.areaId).toBe('camera_alfredo');
  });
});

describe('scorciatoie per profilo (casa sintetica)', () => {
  const { house, states } = fixture();

  it('nessuna scorciatoia da aree private altrui, per ogni profilo', () => {
    for (const p of PROFILES) assertSafe(house, p.id, generateShortcuts(p, house, states));
  });

  it('Giacomo: stanza principale prima, poi area condivisa, poi azione globale', () => {
    const list = generateShortcuts(profile('giacomo'), house, states);
    const entity = list.filter((s) => s.kind === 'entity');
    expect(entity.filter((s) => s.origin === 'main').every((s) => s.areaId === 'camera_giacomo')).toBe(true);
    expect(entity.map((s) => s.kind === 'entity' && s.id)).toEqual(
      expect.arrayContaining(['light.faretti_giacomo', 'cover.finestra_giacomo', 'media_player.fire_tv_di_giacomo_alexa']),
    );
    expect(list.some((s) => s.kind === 'category' && s.id === 'luci')).toBe(true);
    const lastMain = list.map((s) => s.origin).lastIndexOf('main');
    expect(list.findIndex((s) => s.origin === 'personal')).toBeGreaterThan(lastMain);
  });

  it('Casa: solo azioni globali e aree comuni', () => {
    const list = generateShortcuts(profile('casa'), house, states);
    expect(list[0]).toMatchObject({ kind: 'entity', id: 'cover.tutte_le_tapparelle', origin: 'global' });
    expect(list.every((s) => s.origin === 'global' || s.origin === 'common')).toBe(true);
  });

  it('un account sconosciuto non ricade mai su Alfredo', () => {
    const p = resolveProfile('account-sconosciuto');
    expect(p.id).toBe('casa');
    assertSafe(house, 'casa', generateShortcuts(p, house, states));
  });

  it('entita non disponibili o inaffidabili escluse', () => {
    const s2 = { ...states, 'light.faretti_giacomo': st('light.faretti_giacomo', 'unavailable') };
    const ids = generateShortcuts(profile('giacomo'), house, s2).map((s) => s.kind === 'entity' && s.id);
    expect(ids).not.toContain('light.faretti_giacomo');
  });

  it('cambio profilo: Alfredo → Giacomo → Elisabetta → Salvatore → Casa → Giacomo, sempre rigenerate', () => {
    const fresh = Object.fromEntries(PROFILES.map((p) => [p.id, JSON.stringify(generateShortcuts(p, house, states))]));
    for (const id of ['alfredo', 'giacomo', 'elisabetta', 'salvatore', 'casa', 'giacomo']) {
      const list = generateShortcuts(profile(id), house, states);
      expect(JSON.stringify(list)).toBe(fresh[id]); // nessuna cache o stato residuo del profilo precedente
      assertSafe(house, id, list);
    }
  });
});

// Stessa verifica sui dati REALI dell'istantanea di sviluppo, se presente (non e nel repository).
const found = Object.values(import.meta.glob('../../dev-data/snapshot.json', { eager: true, import: 'default' }));
const snap = found[0] as { states: HassEntity[]; areas: AreaEntry[]; devices: DeviceEntry[]; entities: { entities: EntityEntry[] } } | undefined;
describe.skipIf(!snap)('scorciatoie sui dati reali dell’istantanea', () => {
  const states: HassEntities = snap ? Object.fromEntries(snap.states.map((s) => [s.entity_id, s])) : {};
  const reg: Registries = snap ? { areas: snap.areas, devices: snap.devices, entities: snap.entities.entities } : { areas: [], devices: [], entities: [] };
  const house = buildHouse(reg, states);
  const devices = new Map(reg.devices.map((d) => [d.id, d]));
  const entities = new Map(reg.entities.map((e) => [e.ei, e]));

  it('target reali coerenti con i registry e mai privati altrui', () => {
    for (const p of PROFILES) {
      const list = generateShortcuts(p, house, states);
      assertSafe(house, p.id, list);
      for (const s of list) {
        if (s.kind !== 'entity' || s.areaId === null) continue;
        const e = entities.get(s.id)!;
        expect(s.areaId).toBe(resolveEntityArea(e, e.di ? devices.get(e.di) : undefined));
      }
    }
  });

  it('Giacomo non riceve nulla di Camera Alfredo', () => {
    const list = generateShortcuts(profile('giacomo'), house, states);
    for (const s of list) {
      if (s.kind === 'entity') {
        expect(s.id).not.toMatch(/alfredo|android_tv_172_16_137_38/);
        expect(s.areaId).not.toBe('camera_alfredo');
      }
    }
  });
});

describe('sottotitolo (stanza) delle scorciatoie', () => {
  const { house, states } = fixture();
  const subtitles = (id: string) => {
    const primary = primaryArea(id);
    return Object.fromEntries(
      generateShortcuts(profile(id), house, states)
        .filter((s) => s.kind === 'entity')
        .map((s) => [s.id, { label: house.byId.get(s.id)!.name, subtitle: shortcutSubtitle(house, s.areaId, primary) }]),
    );
  };

  it('Giacomo: nessun sottotitolo per la sua camera, "Bagno ragazzi" per il bagno', () => {
    const s = subtitles('giacomo');
    expect(s['light.faretti_giacomo']).toEqual({ label: 'Faretti', subtitle: '' });
    expect(s['light.bagno_ragazzi_faretti']).toEqual({ label: 'Faretti', subtitle: 'Bagno ragazzi' });
  });

  it('Alfredo: camera senza sottotitolo, bagno ragazzi con sottotitolo', () => {
    const s = subtitles('alfredo');
    expect(s['light.faretti_alfredo'].subtitle).toBe('');
    expect(s['cover.balcone_alfredo'].subtitle).toBe('');
    expect(s['light.bagno_ragazzi_faretti'].subtitle).toBe('Bagno ragazzi');
  });

  it('Elisabetta e Salvatore: camera padronale senza sottotitolo, bagno padronale con sottotitolo', () => {
    for (const id of ['elisabetta', 'salvatore']) {
      const s = subtitles(id);
      expect(s['light.camera_padronale_faretti'].subtitle).toBe('');
      expect(s['light.bagno_padr_luce_centro'].subtitle).toBe('Bagno padronale');
    }
  });

  it('Casa: nessuna stanza principale, etichette invariate (stanza sempre indicata)', () => {
    expect(primaryArea('casa')).toBeNull();
    const s = subtitles('casa');
    expect(s['light.luce_pranzo'].subtitle).toBe('Soggiorno');
    expect(s['cover.tutte_le_tapparelle'].subtitle).toBe('');
  });

  it('il sottotitolo non cambia selezione, ordine o target', () => {
    const before = PROFILES.map((p) => JSON.stringify(generateShortcuts(p, house, states)));
    PROFILES.forEach((p) => subtitles(p.id));
    expect(PROFILES.map((p) => JSON.stringify(generateShortcuts(p, house, states)))).toEqual(before);
  });
});
