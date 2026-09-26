import type { ComponentChildren } from 'preact';
import { nav } from '../../app/router';
import { Icon } from './Icon';

interface HeaderProps {
  title: string;
  eyebrow?: string;
  /**
   * Freccia Indietro: torna alla pagina precedente reale. `fallback` si usa solo se non esiste
   * una pagina precedente nell'app (link diretto, primo caricamento).
   */
  back?: { fallback: string };
  children?: ComponentChildren;
}

export function PageHeader({ title, eyebrow, back, children }: HeaderProps) {
  return (
    <header class="page-header">
      {back && (
        <button type="button" class="icon-button page-header__back" onClick={() => nav.back(back.fallback)} aria-label="Indietro">
          <Icon name="back" />
        </button>
      )}
      {eyebrow && <p class="eyebrow">{eyebrow}</p>}
      <h1 class="page-title">{title}</h1>
      {children}
    </header>
  );
}

interface SectionProps {
  title: string;
  /** Link facoltativo a destra del titolo. */
  more?: { href: string; label: string };
  /** small = sezione di supporto: titolo e spaziatura ridotti. */
  size?: 'normal' | 'small';
  children: ComponentChildren;
}

export function Section({ title, more, size = 'normal', children }: SectionProps) {
  return (
    <section class={size === 'small' ? 'section section--small' : 'section'}>
      <div class="section__head">
        <h2 class="section__title">{title}</h2>
        {more && (
          <a class="section__more" href={more.href}>
            {more.label}
            <Icon name="chevron" size="inline" />
          </a>
        )}
      </div>
      {children}
    </section>
  );
}
