import { href } from '../../app/router';
import { fmtPercent, fmtPower } from '../../model/entity';
import type { ContextItem } from '../../model/context';
import type { PowerNow } from '../../model/energy';
import type { FamilyMember } from '../../model/profile';
import { Icon } from './Icon';

/** Presenza della famiglia: compatta, una riga, solo dati affidabili. */
export function FamilyStrip({ members }: { members: FamilyMember[] }) {
  return (
    <ul class="family">
      {members.map(({ profile, presence, self }) => {
        const where = presence.at === 'home' ? 'in casa' : presence.at === 'away' ? 'fuori' : presence.name;
        return (
          <li key={profile.id} class={`family__item${presence.at === 'home' ? ' is-home' : ''}`}>
            <span class="family__avatar" aria-hidden="true">
              <Icon name={presence.at === 'home' ? 'atHome' : 'away'} size="inline" />
            </span>
            <span>
              {profile.displayName}
              {self && <span class="sr-only"> (tu)</span>}
              <span class="family__where"> · {where}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Piccole informazioni contestuali sotto il saluto (allerte, telefono, sveglia): solo quando servono. */
export function ContextChips({ items }: { items: ContextItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul class="context">
      {items.map((c) => {
        const body = (
          <>
            <Icon name={c.icon} size="inline" />
            <span class="num">{c.text}</span>
          </>
        );
        return (
          <li key={c.key}>
            {c.href ? (
              <a class={`context__item context__item--${c.tone}`} href={c.href}>{body}</a>
            ) : (
              <span class={`context__item context__item--${c.tone}`}>{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Energia in una riga: il consumo domina, solare e Powerwall accanto e piu piccoli. */
export function EnergySummary({ power }: { power: PowerNow }) {
  if (power.home === null) return null;
  return (
    <a class="energy-row" href={href('energia')}>
      <span class="energy-row__item energy-row__item--main">
        <span class="energy-row__label">Casa</span>
        <span class="energy-row__value num">{fmtPower(power.home)}</span>
      </span>
      {power.solar !== null && (
        <span class="energy-row__item">
          <span class="energy-row__label">
            <Icon name="solar" size="inline" />
            Solare
          </span>
          <span class="energy-row__side num">{power.solar > 20 ? fmtPower(power.solar) : '0 W'}</span>
        </span>
      )}
      {power.charge !== null && (
        <span class="energy-row__item">
          <span class="energy-row__label">
            <Icon name="homeBattery" size="inline" />
            Powerwall
          </span>
          <span class="energy-row__side num">{fmtPercent(power.charge)}</span>
        </span>
      )}
    </a>
  );
}
