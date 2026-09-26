import { forecast, now, states } from '../../app/store';
import { HOUSE } from '../../config/house';
import { fmtTemp, isAvailable } from '../../model/entity';
import type { IconName } from '../icons';
import { Icon } from './Icon';

export const CONDITIONS: Record<string, [IconName, string]> = {
  'clear-night': ['night', 'Sereno'],
  sunny: ['sunny', 'Soleggiato'],
  partlycloudy: ['partlyCloudy', 'Poco nuvoloso'],
  cloudy: ['cloudy', 'Nuvoloso'],
  fog: ['fog', 'Nebbia'],
  rainy: ['rainy', 'Pioggia'],
  pouring: ['pouring', 'Pioggia forte'],
  snowy: ['snowy', 'Neve'],
  'snowy-rainy': ['snowyRainy', 'Nevischio'],
  lightning: ['lightning', 'Temporale'],
  'lightning-rainy': ['lightningRainy', 'Temporale'],
  hail: ['hail', 'Grandine'],
  windy: ['windy', 'Ventoso'],
  'windy-variant': ['windy', 'Ventoso'],
  exceptional: ['warning', 'Condizioni eccezionali'],
};

/** Meteo attuale con massima e minima di oggi (se le previsioni sono disponibili). */
export function Weather() {
  const w = states.value[HOUSE.weather];
  if (!isAvailable(w)) return null;
  const [baseIcon, label] = CONDITIONS[w.state] ?? (['cloudy', 'Meteo'] as [IconName, string]);
  const hour = new Date(now.value).getHours();
  const icon = w.state === 'partlycloudy' && (hour < 7 || hour >= 20) ? 'nightPartlyCloudy' : baseIcon;
  const temp = Number(w.attributes.temperature);
  const today = forecast.value[0];
  return (
    <div class="weather">
      <Icon name={icon} size="hero" />
      <div>
        <p class="weather__main">
          {Number.isFinite(temp) && <span class="num">{fmtTemp(temp)}</span>} {label}
        </p>
        {today && typeof today.temperature === 'number' && typeof today.templow === 'number' && (
          <p class="weather__sub num">
            Max {fmtTemp(today.temperature)} · Min {fmtTemp(today.templow)}
          </p>
        )}
      </div>
    </div>
  );
}
