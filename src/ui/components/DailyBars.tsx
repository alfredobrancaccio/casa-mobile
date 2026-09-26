import { useState } from 'preact/hooks';
import { fmtEnergy, fmtWeekday } from '../../model/entity';
import type { DayTotals } from '../../model/energy';

interface Props {
  days: DayTotals[];
}

const W = 320;
const H = 140;
const BASE = 118;
const TOP = 16;

/**
 * Ultimi giorni: consumo della casa e produzione solare affiancati.
 * Due serie -> legenda sempre presente; il giorno selezionato mostra i valori esatti.
 */
export function DailyBars({ days }: Props) {
  const [sel, setSel] = useState(days.length - 1);
  if (days.length === 0) return null;
  const max = Math.max(0.1, ...days.map((d) => Math.max(d.home, d.solar)));
  const col = W / days.length;
  const bar = Math.min(14, col / 3);
  const h = (v: number) => (v / max) * (BASE - TOP);
  const current = days[Math.min(sel, days.length - 1)];
  const label = (d: DayTotals) => fmtWeekday(new Date(d.start));

  return (
    <figure class="bars">
      <div class="legend" aria-hidden="true">
        <span><i class="legend__swatch" style={{ background: 'var(--home)' }} />Consumo</span>
        <span><i class="legend__swatch" style={{ background: 'var(--solar)' }} />Solare</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} class="bars__svg" role="group" aria-label="Energia degli ultimi giorni">
        <line x1={0} x2={W} y1={BASE} y2={BASE} class="bars__base" />
        {days.map((d, i) => {
          const cx = col * i + col / 2;
          const selected = i === sel;
          return (
            <g key={d.start} class={selected ? 'bars__day is-selected' : 'bars__day'}>
              <rect x={cx - bar - 1} y={BASE - h(d.home)} width={bar} height={Math.max(0, h(d.home))} rx={3} fill="var(--home)" />
              <rect x={cx + 1} y={BASE - h(d.solar)} width={bar} height={Math.max(0, h(d.solar))} rx={3} fill="var(--solar)" />
              <text x={cx} y={H - 4} class="bars__label">{label(d)}</text>
              <rect
                x={col * i}
                y={0}
                width={col}
                height={H}
                class="bars__hit"
                tabIndex={0}
                role="button"
                aria-pressed={selected}
                aria-label={`${label(d)}: consumo ${fmtEnergy(d.home)}, solare ${fmtEnergy(d.solar)}`}
                onPointerEnter={() => setSel(i)}
                onFocus={() => setSel(i)}
                onClick={() => setSel(i)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' && i > 0) setSel(i - 1);
                  if (e.key === 'ArrowRight' && i < days.length - 1) setSel(i + 1);
                }}
              />
            </g>
          );
        })}
      </svg>
      <figcaption class="bars__readout num" aria-live="polite">
        <strong>{new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric' }).format(new Date(current.start))}</strong>
        {' · '}consumo {fmtEnergy(current.home)} · solare {fmtEnergy(current.solar)}
      </figcaption>
    </figure>
  );
}
