// Personalizzazione: politica delle aree, struttura della Home, privacy e menu Altro.
import { describe, expect, it } from 'vitest';
import { PROFILES } from '../config/profiles';
import type { HassEntities, HassEntity, Registries } from '../ha/types';
import { moreMenuGroups } from '../ui/moreMenu';
import {
  canAreaAppearInHome, canAreaAppearInShortcuts, isAreaPersonalForUser, isAreaPrivateForOtherUser, isCommonArea,
  isRoomArea, isServiceArea, personalAreas,
} from './areaPolicy';
import { headerContext } from './context';
import { homeLayout } from './home';
import { buildHouse } from './house';
import { roomGroups } from './profile';

const profile = (id: string) => PROFILES.find((p) => p.id === id)!;
const ALL_ROOMS = [
  'camera_alfredo', 'camera_giacomo', 'camera_da_letto', 'bagno_padronale', 'bagno_ragazzi', 'corriodio_ragazzi',
  'soggiorno', 'cucina', 'ingresso', 'balconi', 'bagno_servizio', 'camera_servizio',
];

describe('politica delle aree', () => {
  it('aree personali per ciascun profilo, nell’ordine giusto', () => {
    expect(personalAreas('alfredo')).toEqual(['camera_alfredo', 'bagno_ragazzi', 'corriodio_ragazzi']);
    expect(personalAreas('giacomo')).toEqual(['camera_giacomo', 'bagno_ragazzi', 'corriodio_ragazzi']);
    expect(personalAreas('elisabetta')).toEqual(['camera_da_letto', 'bagno_padronale']);
    expect(personalAreas('salvatore')).toEqual(['camera_da_letto', 'bagno_padronale']);
    expect(personalAreas('casa')).toEqual([]);
  });

  it('le stanze private altrui non arrivano in Home ne nelle scorciatoie', () => {
    expect(isAreaPrivateForOtherUser('camera_giacomo', 'alfredo')).toBe(true);
    expect(canAreaAppearInHome('camera_giacomo', 'alfredo')).toBe(false);
    expect(canAreaAppearInShortcuts('camera_giacomo', 'alfredo')).toBe(false);
    expect(canAreaAppearInHome('camera_da_letto', 'giacomo')).toBe(false);
    expect(canAreaAppearInHome('bagno_ragazzi', 'elisabetta')).toBe(false);
    expect(canAreaAppearInHome('corriodio_ragazzi', 'salvatore')).toBe(false);
    for (const id of ['camera_alfredo', 'camera_giacomo', 'camera_da_letto', 'bagno_padronale', 'bagno_ragazzi', 'corriodio_ragazzi']) {
      expect(canAreaAppearInHome(id, 'casa')).toBe(false);
    }
  });

  it('comuni e servizio valgono per tutti; tecniche e ignorate non sono stanze', () => {
    for (const p of ['alfredo', 'giacomo', 'elisabetta', 'salvatore', 'casa']) {
      expect(canAreaAppearInHome('soggiorno', p)).toBe(true);
      expect(canAreaAppearInHome('camera_servizio', p)).toBe(true);
    }
    expect(isCommonArea('balconi')).toBe(true);
    expect(isServiceArea('bagno_servizio')).toBe(true);
    expect(isRoomArea('etere')).toBe(false);
    expect(isRoomArea('garage')).toBe(false);
    expect(canAreaAppearInShortcuts(null, 'alfredo')).toBe(true); // comandi di tutta la casa
    expect(isAreaPersonalForUser('camera_da_letto', 'salvatore')).toBe(true);
  });
});

// Casa minima con tutte le stanze e qualche entita, per verificare la Home.
function fakeHouse() {
  const st = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => ({
    entity_id, state, attributes, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null },
  });
  const reg: Registries = {
    areas: [...ALL_ROOMS, 'etere', 'garage'].map((area_id) => ({ area_id, name: area_id })),
    devices: [],
    entities: [
      { ei: 'light.faretti_alfredo', pl: 'mqtt', ai: 'camera_alfredo' },
      { ei: 'light.faretti_giacomo', pl: 'mqtt', ai: 'camera_giacomo' },
      { ei: 'light.camera_padronale_faretti', pl: 'mqtt', ai: 'camera_da_letto' },
      { ei: 'light.bagno_ragazzi_faretti', pl: 'mqtt', ai: 'bagno_ragazzi' },
      { ei: 'light.luce_pranzo', pl: 'mqtt', ai: 'soggiorno' },
    ],
  };
  const states: HassEntities = Object.fromEntries(
    [...reg.entities.map((e) => st(e.ei, 'off')), st('cover.tutte_le_tapparelle', 'open')].map((s) => [s.entity_id, s]),
  );
  return { house: buildHouse(reg, states), states };
}

describe('struttura della Home', () => {
  const { house, states } = fakeHouse();

  it('ordine delle sezioni per persone e profilo Casa', () => {
    expect(homeLayout(profile('alfredo'), house, states).sections).toEqual(['header', 'family', 'personal', 'shortcuts', 'common', 'energy']);
    expect(homeLayout(profile('casa'), house, states).sections).toEqual(['header', 'family', 'common', 'shortcuts', 'energy']);
  });

  it('stanza principale per prima e nessuna stanza privata altrui', () => {
    const cases: Record<string, string[]> = {
      alfredo: ['camera_alfredo', 'bagno_ragazzi', 'corriodio_ragazzi'],
      giacomo: ['camera_giacomo', 'bagno_ragazzi', 'corriodio_ragazzi'],
      elisabetta: ['camera_da_letto', 'bagno_padronale'],
      salvatore: ['camera_da_letto', 'bagno_padronale'],
      casa: [],
    };
    for (const [id, personal] of Object.entries(cases)) {
      const l = homeLayout(profile(id), house, states);
      expect(l.personal.map((r) => r.id)).toEqual(personal);
      const shown = [...l.personal, ...l.common].map((r) => r.id);
      for (const area of shown) expect(canAreaAppearInHome(area, id)).toBe(true);
      expect(new Set(shown).size).toBe(shown.length); // nessuna stanza ripetuta
      // le aree di servizio non sono in Home (restano in Stanze)
      expect(shown).not.toContain('bagno_servizio');
      expect(shown).not.toContain('camera_servizio');
      expect(l.sections).not.toContain('other' as never);
    }
  });

  it('le scorciatoie rispettano la politica delle aree', () => {
    for (const p of PROFILES) {
      for (const s of homeLayout(p, house, states).shortcuts) {
        if (s.kind === 'entity') expect(canAreaAppearInShortcuts(house.byId.get(s.id)!.areaId, p.id)).toBe(true);
      }
    }
  });

  it('la pagina Stanze resta completa per tutti', () => {
    for (const p of PROFILES) {
      const g = roomGroups(p, house.rooms);
      const all = [...g.mine, ...g.common, ...g.others, ...g.service].map((r) => r.id).sort();
      expect(all).toEqual([...ALL_ROOMS].sort());
    }
  });
});

describe('contesto personale nell’intestazione', () => {
  const device = { key: 'phone', role: 'phone' as const, label: 'Tel', haDeviceId: 'x' };
  const at = (h: number) => new Date(2026, 8, 26, h, 0).getTime();

  it('la batteria compare solo se bassa o in carica', () => {
    expect(headerContext({}, { device, battery: 85 }, at(10))).toEqual([]);
    expect(headerContext({}, { device, battery: 12 }, at(10)).map((c) => c.key)).toEqual(['battery']);
    expect(headerContext({}, { device, battery: 45, charging: true }, at(10)).map((c) => c.key)).toEqual(['charging']);
  });
  it('la sveglia compare la sera se e entro 16 ore', () => {
    const alarm = new Date(2026, 8, 27, 7, 0);
    expect(headerContext({}, { device, nextAlarm: alarm }, at(22)).map((c) => c.key)).toEqual(['alarm']);
    expect(headerContext({}, { device, nextAlarm: alarm }, at(10))).toEqual([]);
  });
});

describe('privacy dei dati personali', () => {
  it('senza dati del proprio telefono l’intestazione non mostra nulla di personale', () => {
    expect(headerContext({}, null, Date.now())).toEqual([]);
  });
  it('il profilo Casa e i profili senza telefono non hanno dispositivi personali', () => {
    expect(profile('casa').devices).toEqual([]);
    expect(profile('giacomo').devices).toEqual([]);
    expect(profile('salvatore').devices).toEqual([]);
  });
});

describe('menu Altro', () => {
  const hrefs = (hasPersonal: boolean) =>
    moreMenuGroups({ hasPersonal, securityBadge: 0, canLogout: true }).flatMap((g) => g.items).map((i) => i.href ?? i.id);

  it('non duplica la navigazione principale', () => {
    for (const h of [...hrefs(true), ...hrefs(false)]) {
      expect(h).not.toMatch(/^#\/(home|stanze|dispositivi|energia)(\/|$)/);
    }
  });
  it('contiene Sicurezza, Stato, Impostazioni, Informazioni ed Esci; I miei dispositivi solo se ci sono dati', () => {
    expect(hrefs(true)).toEqual(expect.arrayContaining(['#/altro/sicurezza', '#/altro/stato', '#/altro/impostazioni', '#/altro/info', 'esci', '#/altro/personale']));
    expect(hrefs(false)).not.toContain('#/altro/personale');
  });
});
