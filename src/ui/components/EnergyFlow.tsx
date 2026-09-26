import type { EnergyNode } from '../../config/energy';
import { fmtPercent, fmtPower } from '../../model/entity';
import type { PowerNow } from '../../model/energy';
import { ICONS, type IconName } from '../icons';

const NODE: Record<EnergyNode, { x: number; y: number; icon: IconName; label: string; color: string }> = {
  solar: { x: 160, y: 72, icon: 'solar', label: 'Solare', color: 'var(--solar)' },
  grid: { x: 56, y: 178, icon: 'grid', label: 'Rete', color: 'var(--grid)' },
  home: { x: 264, y: 178, icon: 'homePower', label: 'Casa', color: 'var(--home)' },
  battery: { x: 160, y: 284, icon: 'homeBattery', label: 'Batteria', color: 'var(--battery)' },
};
const R = 30;

/** Tutti i collegamenti possibili, disegnati tenui; quelli attivi prendono il colore della sorgente. */
const LINKS: [EnergyNode, EnergyNode][] = [
  ['solar', 'home'], ['solar', 'grid'], ['solar', 'battery'], ['grid', 'home'], ['battery', 'home'], ['grid', 'battery'],
];

function segment(a: EnergyNode, b: EnergyNode) {
  const p = NODE[a];
  const q = NODE[b];
  const len = Math.hypot(q.x - p.x, q.y - p.y);
  const ux = (q.x - p.x) / len;
  const uy = (q.y - p.y) / len;
  return { x1: p.x + ux * (R + 6), y1: p.y + uy * (R + 6), x2: q.x - ux * (R + 6), y2: q.y - uy * (R + 6) };
}

function nodeValue(node: EnergyNode, p: PowerNow): string {
  switch (node) {
    case 'solar':
      return p.solar !== null && p.solar > 20 ? fmtPower(p.solar) : 'Inattivo';
    case 'grid':
      if (p.gridUp === false) return 'Assente';
      if (p.grid === null || Math.abs(p.grid) < 20) return 'Nessuno scambio';
      return p.grid > 0 ? `Preleva ${fmtPower(p.grid)}` : `Immette ${fmtPower(p.grid)}`;
    case 'battery': {
      const pct = p.charge !== null ? fmtPercent(p.charge) : '';
      if (p.battery === null || Math.abs(p.battery) < 20) return pct ? `${pct} · ferma` : 'Ferma';
      return `${pct} · ${p.battery > 0 ? 'scarica' : 'carica'}`;
    }
    case 'home':
      return p.home !== null ? fmtPower(p.home) : '';
  }
}

/** Diagramma dei flussi di potenza istantanei, con equivalente testuale. */
export function EnergyFlow({ power }: { power: PowerNow }) {
  const active = new Map(power.flows.map((f) => [`${f.from}-${f.to}`, f]));
  const maxW = Math.max(1, ...power.flows.map((f) => f.watts));
  return (
    <figure class="flow">
      <svg viewBox="0 0 320 356" class="flow__svg" aria-hidden="true">
        {LINKS.map(([a, b]) => {
          const f = active.get(`${a}-${b}`) ?? active.get(`${b}-${a}`);
          const from = f ? f.from : a;
          const to = f ? f.to : b;
          const s = segment(from, to);
          return (
            <g key={`${a}-${b}`}>
              <line {...s} class="flow__track" />
              {f && (
                <line
                  {...s}
                  class="flow__line"
                  stroke={NODE[from].color}
                  stroke-width={2 + 3 * (f.watts / maxW)}
                />
              )}
            </g>
          );
        })}
        {(Object.keys(NODE) as EnergyNode[]).map((n) => {
          const node = NODE[n];
          return (
            <g key={n}>
              <circle cx={node.x} cy={node.y} r={R} class="flow__node" stroke={node.color} />
              <svg x={node.x - 13} y={node.y - 13} width={26} height={26} viewBox="0 0 24 24">
                <path d={ICONS[node.icon]} fill="currentColor" />
              </svg>
              <text x={node.x} y={n === 'solar' ? node.y - R - 22 : node.y + R + 18} class="flow__label">
                {node.label}
              </text>
              <text x={node.x} y={n === 'solar' ? node.y - R - 6 : node.y + R + 34} class="flow__value">
                {nodeValue(n, power)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        <ul class="flow__list">
          {power.flows.length === 0 && <li>Nessun flusso di energia in questo momento.</li>}
          {power.flows.map((f) => (
            <li key={`${f.from}-${f.to}`}>
              <span class="flow__swatch" style={{ background: NODE[f.from].color }} aria-hidden="true" />
              {NODE[f.from].label} → {NODE[f.to].label}
              <span class="num flow__amount">{fmtPower(f.watts)}</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
