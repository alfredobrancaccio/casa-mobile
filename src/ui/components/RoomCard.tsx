import { states } from '../../app/store';
import { href } from '../../app/router';
import { fmtPercent, fmtTemp } from '../../model/entity';
import type { Room } from '../../model/house';
import { roomSummary } from '../../model/summary';
import { type Indicator, roomBrief, roomIndicators } from '../roomIndicators';
import { Icon } from './Icon';

function Metrics({ temperature, humidity, large }: { temperature: number | null; humidity: number | null; large?: boolean }) {
  if (temperature === null && humidity === null) return null;
  return (
    <span class={large ? 'metrics metrics--large' : 'metrics'}>
      {temperature !== null && (
        <span class="metrics__temp num">
          <span class="sr-only">Temperatura </span>
          {fmtTemp(temperature)}
        </span>
      )}
      {humidity !== null && (
        <span class="metrics__hum num">
          <Icon name="humidity" size="inline" />
          <span class="sr-only">Umidità </span>
          {fmtPercent(humidity)}
        </span>
      )}
    </span>
  );
}

function Indicators({ items, limit }: { items: Indicator[]; limit?: number }) {
  const shown = limit ? items.slice(0, limit) : items;
  if (shown.length === 0) return <span class="indicators__quiet">Tutto spento</span>;
  return (
    <ul class="indicators">
      {shown.map((i) => (
        <li key={i.key} class={`indicator indicator--${i.tone}`}>
          <Icon name={i.icon} size="inline" />
          {i.text}
        </li>
      ))}
    </ul>
  );
}

/**
 * Card di una stanza. `variant`:
 * - main: stanza principale del profilo, piu evidente, sintesi completa
 * - card: griglia standard (Stanze, stanze personali secondarie)
 */
export function RoomCard({ room, variant = 'card' }: { room: Room; variant?: 'main' | 'card' }) {
  const s = roomSummary(room, states.value);
  const main = variant === 'main';
  return (
    <a class={main ? 'room-card room-card--main' : 'room-card'} href={href('stanze', room.id)}>
      <span class="room-card__top">
        <span class="room-card__icon">
          <Icon name={room.icon} size="control" />
        </span>
        <span class="room-card__name">{room.name}</span>
        {main && <Icon name="chevron" size="row" class="room-card__chevron" />}
      </span>
      <Metrics temperature={s.temperature} humidity={s.humidity} large={main} />
      <Indicators items={roomIndicators(s)} limit={main ? undefined : 2} />
    </a>
  );
}

export function RoomGrid({ rooms }: { rooms: Room[] }) {
  return (
    <div class="room-grid">
      {rooms.map((r) => (
        <RoomCard key={r.id} room={r} />
      ))}
    </div>
  );
}

/** Elenco compatto: una riga per stanza con sintesi breve. */
export function RoomList({ rooms }: { rooms: Room[] }) {
  return (
    <ul class="room-list">
      {rooms.map((room) => {
        const s = roomSummary(room, states.value);
        return (
          <li key={room.id}>
            <a class="room-row" href={href('stanze', room.id)}>
              <Icon name={room.icon} size="row" />
              <span class="room-row__text">
                <span class="room-row__name">{room.name}</span>
                <span class="room-row__brief">{roomBrief(s)}</span>
              </span>
              {s.temperature !== null && <span class="room-row__temp num">{fmtTemp(s.temperature)}</span>}
              <Icon name="chevron" size="row" class="room-row__chevron" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
