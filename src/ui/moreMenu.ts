// Menu "Altro": funzioni secondarie o occasionali. Non e una pagina: si apre sopra la schermata corrente.
// Non contiene mai le destinazioni della barra di navigazione (Home, Stanze, Dispositivi, Energia).
import { signal } from '@preact/signals';
import type { IconName } from './icons';

/** Stato del menu; aprirlo e chiuderlo passa da ui/overlays.ts (history). */
export const moreOpen = signal(false);

export interface MoreItem {
  id: string;
  label: string;
  icon: IconName;
  /** Link a una pagina di "Altro"; assente per le azioni (es. Esci). */
  href?: string;
  badge?: number;
}

export interface MoreGroup {
  title: string;
  items: MoreItem[];
}

export interface MoreMenuInput {
  /** Il profilo ha dati personali recenti da mostrare. */
  hasPersonal: boolean;
  /** Aperture o anomalie di sicurezza da segnalare sulla voce Sicurezza. */
  securityBadge: number;
  /** Uscita disponibile solo con una sessione reale. */
  canLogout: boolean;
}

export const alt = (page: string) => `#/altro/${page}`;

/** Le pagine di Altro non hanno una pagina padre: senza history interna la freccia porta a Home. */
export const FROM_MORE = { fallback: '#/home' };

export function moreMenuGroups({ hasPersonal, securityBadge, canLogout }: MoreMenuInput): MoreGroup[] {
  const groups: MoreGroup[] = [
    {
      title: 'Casa',
      items: [
        { id: 'sicurezza', label: 'Sicurezza', icon: 'shieldHome', href: alt('sicurezza'), badge: securityBadge || undefined },
        { id: 'meteo', label: 'Meteo e ambiente', icon: 'partlyCloudy', href: alt('meteo') },
        { id: 'spesa', label: 'Lista della spesa', icon: 'cart', href: alt('spesa') },
      ],
    },
  ];
  if (hasPersonal) {
    groups.push({ title: 'Personale', items: [{ id: 'personale', label: 'I miei dispositivi', icon: 'phone', href: alt('personale') }] });
  }
  groups.push(
    {
      title: 'Sistema',
      items: [
        { id: 'stato', label: 'Stato e manutenzione', icon: 'wrench', href: alt('stato') },
        { id: 'rete', label: 'Rete e connessione', icon: 'network', href: alt('rete') },
      ],
    },
    {
      title: 'App',
      items: [
        { id: 'impostazioni', label: 'Impostazioni', icon: 'settings', href: alt('impostazioni') },
        { id: 'info', label: 'Informazioni', icon: 'info', href: alt('info') },
        ...(canLogout ? [{ id: 'esci', label: 'Esci', icon: 'logout' as IconName }] : []),
      ],
    },
  );
  return groups;
}
