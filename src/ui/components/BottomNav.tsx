import { href, isCurrent, route, type Tab } from '../../app/router';
import type { IconName } from '../icons';
import { moreOpen } from '../moreMenu';
import { closeMore, goFromMore, toggleMore } from '../overlays';
import { Icon } from './Icon';

const ITEMS: { tab: Exclude<Tab, 'altro'>; label: string; icon: IconName }[] = [
  { tab: 'home', label: 'Home', icon: 'home' },
  { tab: 'stanze', label: 'Stanze', icon: 'rooms' },
  { tab: 'dispositivi', label: 'Dispositivi', icon: 'devices' },
  { tab: 'energia', label: 'Energia', icon: 'energy' },
];

/**
 * Tab principale: voce normale nella history, ma mai doppia sulla pagina corrente.
 * Con il menu Altro aperto, la pagina scelta prende il posto della voce del menu.
 */
function onTabClick(e: MouseEvent, target: string) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // apertura in nuova scheda
  if (moreOpen.value) {
    e.preventDefault();
    if (isCurrent(target)) closeMore();
    else goFromMore(target);
  } else if (isCurrent(target)) {
    e.preventDefault();
  }
}

export const MORE_BUTTON_ID = 'more-button';
export const MORE_MENU_ID = 'more-menu';

/**
 * Barra inferiore solo a icone. Etichette accessibili tramite aria-label e title.
 * La voce attiva e riconoscibile per forma (pastiglia piena) e contrasto, non solo per colore.
 */
export function BottomNav({ moreBadge }: { moreBadge?: boolean }) {
  const current = route.value.tab;
  const open = moreOpen.value;
  return (
    <nav class="bottom-nav" aria-label="Navigazione principale">
      <ul>
        {ITEMS.map((item) => {
          const active = current === item.tab && !open;
          return (
            <li key={item.tab}>
              <a
                href={href(item.tab)}
                class="nav-btn"
                aria-label={item.label}
                title={item.label}
                aria-current={current === item.tab ? 'page' : undefined}
                data-active={active || undefined}
                onClick={(e) => onTabClick(e, href(item.tab))}
              >
                <Icon name={item.icon} />
              </a>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            id={MORE_BUTTON_ID}
            class="nav-btn"
            aria-label={moreBadge ? 'Altro, ci sono segnalazioni' : 'Altro'}
            title="Altro"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={MORE_MENU_ID}
            aria-current={current === 'altro' ? 'page' : undefined}
            data-active={open || current === 'altro' || undefined}
            onClick={toggleMore}
          >
            <Icon name={open ? 'close' : 'more'} />
            {moreBadge && !open && <span class="nav-btn__dot" aria-hidden="true" />}
          </button>
        </li>
      </ul>
    </nav>
  );
}
