import { house, run, states } from '../../app/store';
import { iconFor } from '../entityVisual';
import { Icon } from './Icon';

/** Le scene sono azioni, non stati: pulsanti compatti invece di riquadri. */
export function SceneChips({ ids }: { ids: string[] }) {
  const h = house.value;
  if (!h) return null;
  return (
    <div class="scene-chips">
      {ids.map((id) => {
        const info = h.byId.get(id);
        const s = states.value[id];
        if (!info) return null;
        const offline = !s || s.state === 'unavailable';
        return (
          <button
            key={id}
            type="button"
            class="scene-chip"
            disabled={offline}
            onClick={() => run(id, { type: 'activate' })}
          >
            <Icon name={offline ? 'offline' : iconFor(info, s)} size="row" />
            {info.name}
            {offline && <span class="sr-only"> (non raggiungibile)</span>}
          </button>
        );
      })}
    </div>
  );
}
