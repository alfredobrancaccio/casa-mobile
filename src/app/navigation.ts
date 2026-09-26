// NAVIGAZIONE E HISTORY
//
// Una sola history: quella del browser. Freccia dell'app, tasto Indietro del browser e gesto
// Indietro dello smartphone percorrono le stesse voci.
//
// - Ogni voce creata dall'app porta `{ casa: true, idx }`: idx > 0 significa che esiste una pagina
//   precedente DENTRO l'app. Con idx 0 (link diretto, primo caricamento) la freccia usa un fallback
//   invece di uscire dall'app.
// - Gli overlay (menu Altro, pannello di dettaglio) aggiungono una voce con la stessa URL:
//   Indietro chiude prima l'overlay, poi naviga.
// - La posizione di scroll e salvata per voce e ripristinata tornando indietro.

export interface NavEnv {
  getState(): unknown;
  getHash(): string;
  push(state: NavState, url?: string): void;
  replace(state: NavState, url?: string): void;
  back(): void;
  onPopState(cb: (state: unknown) => void): void;
  onHashChange(cb: () => void): void;
  getScroll(): number;
  setScroll(y: number): void;
  /** Esegue dopo il rendering della nuova pagina. */
  afterRender(cb: () => void): void;
}

export interface NavState {
  casa: true;
  idx: number;
  overlay?: true;
}

const isNavState = (s: unknown): s is NavState => !!s && typeof s === 'object' && (s as NavState).casa === true;

export interface Navigator {
  /** Torna alla pagina precedente reale; `fallback` solo se non esiste una pagina precedente nell'app. */
  back(fallback: string): void;
  /** Apre un overlay non routato; Indietro lo chiudera senza cambiare pagina. */
  openOverlay(close: () => void): void;
  /** Chiude l'overlay aperto (rimuovendo la sua voce di history). */
  closeOverlay(): void;
  /** Naviga partendo da un overlay: la nuova pagina prende il posto della voce dell'overlay. */
  goFromOverlay(hash: string): void;
  readonly hasOverlay: boolean;
  /** Indice della voce corrente (0 = prima pagina dell'app in questa sessione). */
  readonly index: number;
}

export function createNavigator(env: NavEnv, onRoute: (hash: string) => void): Navigator {
  const scrolls = new Map<number, number>();
  let closeCurrent: (() => void) | null = null;
  let idx = 0;

  const start = env.getState();
  if (isNavState(start) && !start.overlay) idx = start.idx;
  else env.replace({ casa: true, idx: 0 }); // prima voce dell'app (o overlay rimasto da un ricaricamento)

  const show = (restore: number) => {
    onRoute(env.getHash());
    env.afterRender(() => env.setScroll(restore));
  };

  /** Passa a una voce esistente della history ricordando lo scroll di quella che si lascia. */
  const moveTo = (target: number) => {
    if (target === idx) return;
    scrolls.set(idx, env.getScroll());
    idx = target;
  };

  // Indietro/avanti del browser (scatta anche senza cambio di URL, come per gli overlay).
  env.onPopState((state) => {
    if (isNavState(state)) moveTo(state.idx);
    if (closeCurrent && !(isNavState(state) && state.overlay)) {
      const close = closeCurrent;
      closeCurrent = null;
      close();
    }
  });

  // Cambio di pagina: attraversamento della history oppure link cliccato (voce nuova).
  env.onHashChange(() => {
    const state = env.getState();
    if (isNavState(state)) {
      moveTo(state.idx); // di norma gia fatto da popstate
      show(scrolls.get(idx) ?? 0);
      return;
    }
    // Voce nuova creata da un link: la numeriamo e si parte dall'alto.
    scrolls.set(idx, env.getScroll());
    idx += 1;
    for (const k of [...scrolls.keys()]) if (k >= idx) scrolls.delete(k);
    env.replace({ casa: true, idx });
    show(0);
  });

  return {
    back(fallback) {
      if (closeCurrent) return this.closeOverlay();
      if (idx > 0) {
        env.back();
        return;
      }
      // Nessuna pagina precedente nell'app: si resta dentro l'app sostituendo la voce corrente.
      if (env.getHash() === fallback) return;
      env.replace({ casa: true, idx: 0 }, fallback);
      show(0);
    },
    openOverlay(close) {
      if (closeCurrent) {
        closeCurrent();
        closeCurrent = close;
        return; // un solo overlay alla volta: riusa la voce gia presente
      }
      closeCurrent = close;
      env.push({ casa: true, idx: idx + 1, overlay: true });
      idx += 1;
    },
    closeOverlay() {
      if (!closeCurrent) return;
      const state = env.getState();
      if (isNavState(state) && state.overlay) {
        env.back(); // popstate chiudera l'overlay
      } else {
        const close = closeCurrent;
        closeCurrent = null;
        close();
      }
    },
    goFromOverlay(hash) {
      const close = closeCurrent;
      closeCurrent = null;
      close?.();
      const state = env.getState();
      const onOverlayEntry = isNavState(state) && state.overlay;
      if (!onOverlayEntry) {
        // nessuna voce di overlay da riusare: navigazione normale
        scrolls.set(idx, env.getScroll());
        idx += 1;
        env.push({ casa: true, idx }, hash);
      } else {
        // la voce dell'overlay diventa la nuova pagina: nessuna voce "fantasma" nella history
        scrolls.set(idx - 1, env.getScroll());
        env.replace({ casa: true, idx }, hash);
      }
      show(0);
    },
    get hasOverlay() {
      return closeCurrent !== null;
    },
    get index() {
      return idx;
    },
  };
}

/** Ambiente reale: history e scroll del browser. */
export function browserEnv(): NavEnv {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  return {
    getState: () => history.state,
    getHash: () => window.location.hash || '#/home',
    push: (state, url) => history.pushState(state, '', url),
    replace: (state, url) => history.replaceState(state, '', url),
    back: () => history.back(),
    onPopState: (cb) => window.addEventListener('popstate', (e) => cb(e.state)),
    onHashChange: (cb) => window.addEventListener('hashchange', cb),
    getScroll: () => window.scrollY,
    setScroll: (y) => window.scrollTo({ top: y }),
    // Preact disegna in un microtask: un timer successivo trova gia la nuova pagina.
    // (requestAnimationFrame verrebbe sospeso a schermo non visibile.)
    afterRender: (cb) => setTimeout(cb, 0),
  };
}
