import { house, run, states } from '../../app/store';
import { isActive, isAvailable } from '../../model/entity';
import type { EntityInfo } from '../../model/house';
import { iconFor, stateText } from '../entityVisual';
import { openDetail } from '../overlays';
import { Icon } from './Icon';

export type Mode = 'toggle' | 'detail' | 'activate' | 'static';

export function modeOf(info: EntityInfo): Mode {
  switch (info.kind) {
    case 'light':
    case 'switch':
      return 'toggle';
    case 'cover':
    case 'climate':
    case 'media':
      return 'detail';
    case 'scene':
      return 'activate';
    default:
      return 'static';
  }
}

const dimmable = (modes: unknown) =>
  Array.isArray(modes) && modes.some((m) => m !== 'onoff');

interface Props {
  id: string;
  /** Mostra la stanza sotto il nome (viste trasversali alle stanze). */
  showArea?: boolean;
  /** Stanza di riferimento: la stanza viene mostrata solo per le entita di altre stanze. */
  homeArea?: string | null;
}

/** Riquadro standard di un'entita: icona, nome, stato e azione principale. */
export function EntityTile({ id, showArea, homeArea }: Props) {
  const h = house.value;
  const info = h?.byId.get(id);
  if (!h || !info) return null;
  const s = states.value[id];
  const mode = modeOf(info);
  const reachable = mode === 'activate' ? !!s && s.state !== 'unavailable' : isAvailable(s);
  const active = reachable && isActive(s);
  const status = info.unreliable && reachable ? `${stateText(info, s)} · da verificare` : stateText(info, s);
  const area = showArea || (homeArea !== undefined && info.areaId !== homeArea) ? h.areaName(info.areaId) : '';
  const cls = ['tile', active && 'tile--active', !reachable && 'tile--offline', mode === 'static' && 'tile--static']
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span class="tile__icon">
        <Icon name={reachable ? iconFor(info, s) : 'offline'} />
      </span>
      <span class="tile__text">
        <span class="tile__name">{info.name}</span>
        <span class="tile__state num">
          {area ? `${area} · ${status}` : status}
        </span>
      </span>
    </>
  );

  if (mode === 'static' || !reachable) {
    return (
      <div class={cls} title={info.unreliable}>
        {content}
        {info.unreliable && (
          <span class="tile__flag">
            <Icon name="warning" size="inline" label="Dato da verificare" />
          </span>
        )}
      </div>
    );
  }

  const onMain = () => {
    if (mode === 'toggle') void run(id, { type: 'toggle' });
    else if (mode === 'activate') void run(id, { type: 'activate' });
    else openDetail(id);
  };
  const hasMore = mode === 'toggle' && info.kind === 'light' && dimmable(s?.attributes.supported_color_modes);

  return (
    <div class={cls}>
      <button
        type="button"
        class="tile__main"
        onClick={onMain}
        aria-pressed={mode === 'toggle' ? active : undefined}
        aria-haspopup={mode === 'detail' ? 'dialog' : undefined}
      >
        {content}
      </button>
      {hasMore && (
        <button type="button" class="tile__more" onClick={() => openDetail(id)} aria-label={`Regola ${info.name}`}>
          <Icon name="tune" size="row" />
        </button>
      )}
    </div>
  );
}

export function TileGrid({ ids, showArea, homeArea }: { ids: string[] } & Omit<Props, 'id'>) {
  return (
    <div class="tile-grid">
      {ids.map((id) => (
        <EntityTile key={id} id={id} showArea={showArea} homeArea={homeArea} />
      ))}
    </div>
  );
}
