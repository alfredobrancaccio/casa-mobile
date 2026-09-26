import type { StatRow } from '../../ha/types';

interface Props {
  rows: StatRow[];
  /** Descrizione per gli screen reader, es. "Temperatura nelle ultime 24 ore". */
  label: string;
  format: (n: number) => string;
}

const W = 160;
const H = 40;
const PAD = 3;

/** Andamento compatto di una sola serie: nessuna legenda, minimo e massimo in chiaro. */
export function Sparkline({ rows, label, format }: Props) {
  const values = rows.map((r) => r.mean).filter((v): v is number => typeof v === 'number');
  if (values.length < 3) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (values.length - 1);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const last = values[values.length - 1];
  const summary = `${label}: minimo ${format(min)}, massimo ${format(max)}, ora ${format(last)}`;
  return (
    <figure class="spark">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={summary}>
        <path d={d} fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"
          stroke-linejoin="round" stroke-linecap="round" />
      </svg>
      <figcaption class="spark__caption num" aria-hidden="true">
        <span>min {format(min)}</span>
        <span>ultime 24 ore</span>
        <span>max {format(max)}</span>
      </figcaption>
    </figure>
  );
}
