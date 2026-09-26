import { now, states } from '../../app/store';
import { fmtPercent, fmtTemp, numeric } from '../../model/entity';
import type { Room } from '../../model/house';
import { useStatistics } from '../useStatistics';
import { Icon } from './Icon';
import { Sparkline } from './Sparkline';

/** Clima di una stanza: temperatura e umidita attuali, andamento delle ultime 24 ore. */
export function ClimateCard({ room, title }: { room: Room; title?: string }) {
  const temp = room.temperature ? numeric(states.value[room.temperature]) : null;
  const hum = room.humidity ? numeric(states.value[room.humidity]) : null;
  const stats = useStatistics(room.temperature ? [room.temperature] : [], 'hour', now.value - 24 * 3_600_000, ['mean']);
  if (temp === null && hum === null) return null;
  const rows = room.temperature ? stats?.[room.temperature] ?? [] : [];
  return (
    <div class="card climate-card">
      <div class="climate-card__head">
        {title && <h3 class="climate-card__title">{title}</h3>}
        <div class="climate-card__values">
          {temp !== null && (
            <span class="climate-card__value">
              <Icon name="thermometer" size="row" label="Temperatura" />
              <span class="num">{fmtTemp(temp)}</span>
            </span>
          )}
          {hum !== null && (
            <span class="climate-card__value climate-card__value--sub">
              <Icon name="humidity" size="row" label="Umidità" />
              <span class="num">{fmtPercent(hum)}</span>
            </span>
          )}
        </div>
      </div>
      <Sparkline rows={rows} label={`Temperatura ${room.name}, ultime 24 ore`} format={fmtTemp} />
    </div>
  );
}
