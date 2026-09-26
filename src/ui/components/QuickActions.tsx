import { house, run, states } from '../../app/store';
import { href } from '../../app/router';
import { isActive, isAvailable } from '../../model/entity';
import { type ResolvedShortcut, shortcutSubtitle } from '../../model/shortcuts';
import { CATEGORIES, categoryEntities } from '../../model/summary';
import { iconFor, stateText } from '../entityVisual';
import { openDetail } from '../overlays';
import { modeOf } from './EntityTile';
import { Icon } from './Icon';

/** Azioni rapide: pulsanti piccoli, soprattutto iconografici, con etichetta breve. */
export function QuickActions({ items, primaryArea }: { items: ResolvedShortcut[]; primaryArea: string | null }) {
  return (
    <ul class="quick-actions">
      {items.map((s) => (
        <li key={s.kind === 'entity' ? s.id : `cat-${s.id}`}>
          {s.kind === 'entity' ? <EntityAction id={s.id} primaryArea={primaryArea} /> : <CategoryAction id={s.id} />}
        </li>
      ))}
    </ul>
  );
}

/** Etichetta, icona e comando derivano tutti dalla stessa entita: non possono divergere. */
function EntityAction({ id, primaryArea }: { id: string; primaryArea: string | null }) {
  const h = house.value!;
  const info = h.byId.get(id);
  if (!info) return null;
  const s = states.value[id];
  const mode = modeOf(info);
  const reachable = isAvailable(s);
  const active = reachable && isActive(s);
  // Stanza indicata per tutte le scorciatoie tranne quelle della stanza principale del profilo.
  const area = shortcutSubtitle(h, info.areaId, primaryArea);
  const status = stateText(info, s);
  const onClick = () => {
    if (mode === 'toggle') void run(id, { type: 'toggle' });
    else if (mode === 'activate') void run(id, { type: 'activate' });
    else openDetail(id);
  };
  return (
    <button
      type="button"
      class={`quick${active ? ' quick--active' : ''}${reachable ? '' : ' quick--offline'}`}
      onClick={onClick}
      disabled={!reachable}
      aria-pressed={mode === 'toggle' ? active : undefined}
      aria-haspopup={mode === 'detail' ? 'dialog' : undefined}
      aria-label={`${info.name}${area ? `, ${area}` : ''}: ${status}`}
      title={`${info.name}${area ? ` · ${area}` : ''} — ${status}`}
      data-entity-id={id}
    >
      <span class="quick__icon" aria-hidden="true">
        <Icon name={reachable ? iconFor(info, s) : 'offline'} size="control" />
      </span>
      <span class="quick__label" aria-hidden="true">{info.name}</span>
      {area && <span class="quick__area" aria-hidden="true">{area}</span>}
    </button>
  );
}

function CategoryAction({ id }: { id: 'luci' | 'tapparelle' }) {
  const h = house.value!;
  const cat = CATEGORIES.find((c) => c.id === id)!;
  const on = categoryEntities(h, cat).filter((e) => isActive(states.value[e.id])).length;
  const label = id === 'luci' ? (on ? `${on} luci accese` : 'Luci spente') : on ? `${on} tapparelle aperte` : 'Tapparelle chiuse';
  return (
    <a class={`quick${on ? ' quick--count' : ''}`} href={href('dispositivi', id)} aria-label={`${label}: apri ${cat.label}`}>
      <span class="quick__icon" aria-hidden="true">
        <Icon name={id === 'luci' ? (on ? 'lightOn' : 'light') : on ? 'shutterOpen' : 'shutter'} size="control" />
      </span>
      <span class="quick__label num" aria-hidden="true">{label}</span>
    </a>
  );
}
