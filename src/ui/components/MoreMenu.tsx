import { useEffect, useRef } from 'preact/hooks';
import { logout } from '../../app/store';
import { type MoreGroup, moreOpen } from '../moreMenu';
import { closeMore, goFromMore } from '../overlays';
import { MORE_BUTTON_ID, MORE_MENU_ID } from './BottomNav';
import { Icon } from './Icon';

/**
 * Menu "Altro" sopra la schermata corrente: sfondo sfocato e scurito, piccolo pannello
 * ancorato alla barra inferiore. Si chiude toccando fuori, con Esc o premendo di nuovo Altro.
 */
export function MoreMenu({ groups }: { groups: MoreGroup[] }) {
  const open = moreOpen.value;
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const button = document.getElementById(MORE_BUTTON_ID);
    const main = document.getElementById('main');
    main?.setAttribute('inert', '');
    panel.current?.querySelector<HTMLElement>('a, button')?.focus();

    const focusables = () => [
      ...(panel.current?.querySelectorAll<HTMLElement>('a, button') ?? []),
      ...(button ? [button] : []),
    ];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMore();
      } else if (e.key === 'Tab') {
        // Il focus resta tra le voci del menu e il pulsante Altro.
        const list = focusables();
        const i = list.indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : i === list.length - 1 ? 0 : i + 1;
        e.preventDefault();
        list[next]?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      main?.removeAttribute('inert');
      button?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <>
      <div class="more-backdrop" onClick={closeMore} aria-hidden="true" />
      <div id={MORE_MENU_ID} ref={panel} class="more-menu" role="dialog" aria-label="Altro">
        {groups.map((g) => (
          <section key={g.title} class="more-menu__group" aria-label={g.title}>
            <h2 class="more-menu__title">{g.title}</h2>
            <ul>
              {g.items.map((item) => (
                <li key={item.id}>
                  {item.href ? (
                    <a
                      class="more-item"
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        goFromMore(item.href!);
                      }}
                    >
                      <Icon name={item.icon} size="row" />
                      <span class="more-item__label">{item.label}</span>
                      {item.badge !== undefined && (
                        <span class="more-item__badge num" aria-label={`${item.badge} da guardare`}>{item.badge}</span>
                      )}
                    </a>
                  ) : (
                    <button type="button" class="more-item" onClick={() => void logout()}>
                      <Icon name={item.icon} size="row" />
                      <span class="more-item__label">{item.label}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
