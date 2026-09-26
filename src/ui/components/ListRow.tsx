import type { ComponentChildren } from 'preact';
import type { IconName } from '../icons';
import { Icon } from './Icon';

interface Props {
  icon: IconName;
  title: string;
  detail?: ComponentChildren;
  value?: ComponentChildren;
  href?: string;
  tone?: 'neutral' | 'critical' | 'warning' | 'info';
}

/** Riga di elenco: icona, titolo, dettaglio e valore; diventa un link se `href`. */
export function ListRow({ icon, title, detail, value, href, tone = 'neutral' }: Props) {
  const body = (
    <>
      <span class={`list-row__icon tone--${tone}`}>
        <Icon name={icon} size="row" />
      </span>
      <span class="list-row__text">
        <span class="list-row__title">{title}</span>
        {detail && <span class="list-row__detail">{detail}</span>}
      </span>
      {value !== undefined && <span class="list-row__value num">{value}</span>}
      {href && <Icon name="chevron" size="row" class="list-row__chevron" />}
    </>
  );
  return (
    <li>
      {href ? (
        <a class="list-row list-row--link" href={href}>
          {body}
        </a>
      ) : (
        <div class="list-row">{body}</div>
      )}
    </li>
  );
}

export function List({ children, label }: { children: ComponentChildren; label?: string }) {
  return (
    <ul class="list" aria-label={label}>
      {children}
    </ul>
  );
}
