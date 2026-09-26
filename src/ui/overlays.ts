// Overlay non routati (menu Altro, pannello di dettaglio) legati alla history:
// Indietro del browser, gesto Indietro e freccia dell'app li chiudono prima di cambiare pagina.
import { nav } from '../app/router';
import { moreOpen } from './moreMenu';
import { detailEntity } from './sheet';

export function openMore(): void {
  moreOpen.value = true;
  nav.openOverlay(() => (moreOpen.value = false));
}

export function closeMore(): void {
  if (moreOpen.value) nav.closeOverlay();
}

export const toggleMore = () => (moreOpen.value ? closeMore() : openMore());

/** Voce del menu Altro: la nuova pagina sostituisce la voce del menu (nessun passo fantasma). */
export function goFromMore(hash: string): void {
  nav.goFromOverlay(hash);
}

export function openDetail(id: string): void {
  detailEntity.value = id;
  nav.openOverlay(() => (detailEntity.value = null));
}

export function closeDetail(): void {
  if (detailEntity.value) nav.closeOverlay();
}
