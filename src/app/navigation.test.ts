// Navigazione: si simula la history del browser (voci, popstate, hashchange, scroll)
// e si verifica che Indietro torni sempre alla pagina precedente reale.
import { describe, expect, it } from 'vitest';
import { createNavigator, type NavEnv, type NavState } from './navigation';

interface Entry {
  state: unknown;
  hash: string;
}

/** Browser finto con la semantica rilevante: link = voce nuova (+popstate/hashchange), back = attraversamento. */
class FakeBrowser implements NavEnv {
  entries: Entry[];
  i = 0;
  scroll = 0;
  backCalls = 0;
  private pop: ((s: unknown) => void)[] = [];
  private hash: (() => void)[] = [];

  constructor(start: string) {
    this.entries = [{ state: null, hash: start }];
  }
  get current() {
    return this.entries[this.i];
  }
  getState = () => this.current.state;
  getHash = () => this.current.hash;
  push = (state: NavState, url?: string) => {
    this.entries.splice(this.i + 1);
    this.entries.push({ state, hash: url ?? this.current.hash });
    this.i += 1;
  };
  replace = (state: NavState, url?: string) => {
    this.entries[this.i] = { state, hash: url ?? this.current.hash };
  };
  back = () => {
    this.backCalls += 1;
    if (this.i === 0) return; // il browser uscirebbe dall'app
    const before = this.current.hash;
    this.i -= 1;
    this.pop.forEach((cb) => cb(this.current.state));
    if (this.current.hash !== before) this.hash.forEach((cb) => cb());
  };
  onPopState = (cb: (s: unknown) => void) => void this.pop.push(cb);
  onHashChange = (cb: () => void) => void this.hash.push(cb);
  getScroll = () => this.scroll;
  setScroll = (y: number) => void (this.scroll = y);
  afterRender = (cb: () => void) => cb();

  /** Click su un link interno (<a href="#/...">). */
  click(hash: string) {
    if (hash === this.current.hash) return; // stessa URL: il browser non aggiunge voci
    this.entries.splice(this.i + 1);
    this.entries.push({ state: null, hash });
    this.i += 1;
    this.pop.forEach((cb) => cb(null));
    this.hash.forEach((cb) => cb());
  }
}

function setup(start = '#/home') {
  const b = new FakeBrowser(start);
  const shown: string[] = [];
  const nav = createNavigator(b, (h) => shown.push(h));
  return { b, nav, shown };
}

/** Pannello di dettaglio / menu Altro: stato aperto controllato dal navigatore. */
function overlay(nav: ReturnType<typeof setup>['nav']) {
  const o = { open: false };
  return {
    o,
    open: () => {
      o.open = true;
      nav.openOverlay(() => (o.open = false));
    },
  };
}

describe('Indietro torna alla pagina di provenienza reale', () => {
  it('1. Home → Camera Giacomo → Indietro = Home', () => {
    const { b, nav } = setup('#/home');
    b.click('#/stanze/camera_giacomo');
    nav.back('#/stanze');
    expect(b.getHash()).toBe('#/home');
  });

  it('2. Stanze → Camera Giacomo → Indietro = Stanze', () => {
    const { b, nav } = setup('#/stanze');
    b.click('#/stanze/camera_giacomo');
    nav.back('#/stanze');
    expect(b.getHash()).toBe('#/stanze');
  });

  it('3. Home → Camera Giacomo → dettaglio → Indietro = Camera Giacomo → Indietro = Home', () => {
    const { b, nav } = setup('#/home');
    b.click('#/stanze/camera_giacomo');
    const d = overlay(nav);
    d.open();
    b.back(); // gesto o tasto Indietro del browser
    expect(d.o.open).toBe(false);
    expect(b.getHash()).toBe('#/stanze/camera_giacomo');
    nav.back('#/stanze');
    expect(b.getHash()).toBe('#/home');
  });

  it('4. Dispositivi → Luci → dettaglio luce → Indietro = Luci → Indietro = Dispositivi', () => {
    const { b, nav } = setup('#/dispositivi');
    b.click('#/dispositivi/luci');
    const d = overlay(nav);
    d.open();
    nav.back('#/dispositivi'); // freccia dell'app con overlay aperto: chiude l'overlay
    expect(d.o.open).toBe(false);
    expect(b.getHash()).toBe('#/dispositivi/luci');
    nav.back('#/dispositivi');
    expect(b.getHash()).toBe('#/dispositivi');
  });

  it('5-6. Home o Stanze → Soggiorno → Indietro = origine', () => {
    for (const origin of ['#/home', '#/stanze']) {
      const { b, nav } = setup(origin);
      b.click('#/stanze/soggiorno');
      nav.back('#/stanze');
      expect(b.getHash()).toBe(origin);
    }
  });

  it('7. Sicurezza → dettaglio → Indietro = Sicurezza', () => {
    const { b, nav } = setup('#/altro/sicurezza');
    const d = overlay(nav);
    d.open();
    b.back();
    expect(d.o.open).toBe(false);
    expect(b.getHash()).toBe('#/altro/sicurezza');
  });

  it('11. Home → Stanze → Camera Alfredo → Indietro = Stanze → Indietro = Home', () => {
    const { b, nav } = setup('#/home');
    b.click('#/stanze');
    b.click('#/stanze/camera_alfredo');
    nav.back('#/stanze');
    expect(b.getHash()).toBe('#/stanze');
    b.back();
    expect(b.getHash()).toBe('#/home');
  });
});

describe('Altro e overlay', () => {
  it('8. Altro aperto → Indietro chiude il menu senza cambiare pagina; secondo Indietro naviga', () => {
    const { b, nav, shown } = setup('#/home');
    b.click('#/stanze');
    const m = overlay(nav);
    m.open();
    const before = shown.length;
    b.back();
    expect(m.o.open).toBe(false);
    expect(b.getHash()).toBe('#/stanze');
    expect(shown.length).toBe(before); // nessun cambio di route
    b.back();
    expect(b.getHash()).toBe('#/home');
  });

  it('voce di Altro: la pagina scelta sostituisce il menu (nessun passo fantasma)', () => {
    const { b, nav } = setup('#/home');
    b.click('#/stanze');
    const m = overlay(nav);
    m.open();
    nav.goFromOverlay('#/altro/sicurezza');
    expect(m.o.open).toBe(false);
    expect(b.getHash()).toBe('#/altro/sicurezza');
    nav.back('#/home');
    expect(b.getHash()).toBe('#/stanze');
  });

  it('chiusura dal pulsante (X, Esc, tocco fuori) rimuove la voce dell’overlay', () => {
    const { b, nav } = setup('#/home');
    const m = overlay(nav);
    m.open();
    expect(b.entries).toHaveLength(2);
    nav.closeOverlay();
    expect(m.o.open).toBe(false);
    expect(b.i).toBe(0);
    expect(b.getHash()).toBe('#/home');
  });
});

describe('link diretti e primo caricamento', () => {
  it('9. accesso diretto a una stanza → Indietro = Stanze, senza uscire dall’app', () => {
    const { b, nav } = setup('#/stanze/cucina');
    nav.back('#/stanze');
    expect(b.getHash()).toBe('#/stanze');
    expect(b.backCalls).toBe(0);
    expect(b.entries).toHaveLength(1);
  });

  it('10. accesso diretto a una categoria di dispositivi → Indietro = Dispositivi', () => {
    const { b, nav } = setup('#/dispositivi/luci');
    nav.back('#/dispositivi');
    expect(b.getHash()).toBe('#/dispositivi');
    expect(b.backCalls).toBe(0);
  });

  it('accesso diretto a Sicurezza → Indietro = Home', () => {
    const { b, nav } = setup('#/altro/sicurezza');
    nav.back('#/home');
    expect(b.getHash()).toBe('#/home');
  });

  it('dopo un ricaricamento la history interna resta valida', () => {
    const b = new FakeBrowser('#/home');
    createNavigator(b, () => undefined);
    b.click('#/stanze/cucina');
    const nav = createNavigator(b, () => undefined); // stessa history, app ricaricata
    nav.back('#/stanze');
    expect(b.getHash()).toBe('#/home');
  });
});

describe('bottom navigation e scroll', () => {
  it('12. premere la tab corrente non aggiunge voci', () => {
    const { b } = setup('#/home');
    b.click('#/home');
    expect(b.entries).toHaveLength(1);
  });

  it('13. Home scorsa → stanza → Indietro: posizione ripristinata; pagina nuova dall’alto', () => {
    const { b, nav } = setup('#/home');
    b.scroll = 840;
    b.click('#/stanze/soggiorno');
    expect(b.scroll).toBe(0);
    b.scroll = 300;
    nav.back('#/stanze');
    expect(b.getHash()).toBe('#/home');
    expect(b.scroll).toBe(840);
  });

  it('Luci scorsa → dettaglio → Indietro: la lista resta dov’era', () => {
    const { b, nav } = setup('#/dispositivi');
    b.click('#/dispositivi/luci');
    b.scroll = 1200;
    const d = overlay(nav);
    d.open();
    b.back();
    expect(b.scroll).toBe(1200);
  });
});
