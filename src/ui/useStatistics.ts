import { useEffect, useState } from 'preact/hooks';
import { source } from '../app/store';
import type { StatPeriod, StatRow, StatType } from '../ha/types';

const TTL = 10 * 60_000;
const cache = new Map<string, { at: number; data: Record<string, StatRow[]> }>();

/** Statistiche a lungo termine di HA, con cache di 10 minuti. null finche non arrivano. */
export function useStatistics(
  ids: string[], period: StatPeriod, startMs: number, types: StatType[],
): Record<string, StatRow[]> | null {
  const key = `${period}|${types.join(',')}|${Math.floor(startMs / 3_600_000)}|${ids.join(',')}`;
  const [data, setData] = useState(() => cache.get(key)?.data ?? null);

  useEffect(() => {
    const src = source.value;
    if (!src || ids.length === 0) return;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) {
      setData(hit.data);
      return;
    }
    let alive = true;
    src.statistics(ids, period, startMs, types)
      .then((res) => {
        cache.set(key, { at: Date.now(), data: res });
        if (alive) setData(res);
      })
      .catch(() => alive && setData({}));
    return () => {
      alive = false;
    };
  }, [key]);

  return data;
}
