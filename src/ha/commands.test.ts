import { describe, expect, it, vi } from 'vitest';
import { buildCall, createLiveGateway, readOnlyGateway, type ServiceCall } from './commands';
import type { HassEntity } from './types';

const entity = (entity_id: string, state: string): HassEntity => ({
  entity_id, state, attributes: {}, last_changed: '', last_updated: '',
  context: { id: '', parent_id: null, user_id: null },
});

function setup(states: Record<string, HassEntity>, send = vi.fn(async (_c: ServiceCall) => undefined)) {
  return { send, gw: createLiveGateway(send, (id) => states[id]) };
}

describe('gateway reale', () => {
  const states = {
    'light.a': entity('light.a', 'off'),
    'cover.b': entity('cover.b', 'open'),
    'switch.off': entity('switch.off', 'unavailable'),
    'alarm_control_panel.casa': entity('alarm_control_panel.casa', 'disarmed'),
  };

  it('invia la chiamata di servizio costruita dalla UI', async () => {
    const { send, gw } = setup(states);
    expect(gw.enabled).toBe(true);
    const call = buildCall('cover.b', { type: 'coverPosition', position: 40 });
    expect(await gw.execute(call)).toEqual({ ok: true });
    expect(send).toHaveBeenCalledWith(call);
  });

  it('non invia verso entita assenti o non raggiungibili', async () => {
    const { send, gw } = setup(states);
    expect(await gw.execute(buildCall('light.missing', { type: 'toggle' }))).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(await gw.execute(buildCall('switch.off', { type: 'toggle' }))).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(send).not.toHaveBeenCalled();
  });

  it("rifiuta i domini non previsti, come l'allarme", async () => {
    const { send, gw } = setup(states);
    const call: ServiceCall = { domain: 'alarm_control_panel', service: 'alarm_disarm', target: { entity_id: 'alarm_control_panel.casa' } };
    expect(await gw.execute(call)).toMatchObject({ ok: false, reason: 'error' });
    expect(send).not.toHaveBeenCalled();
  });

  it('traduce gli errori di Home Assistant', async () => {
    const { gw } = setup(states, vi.fn(async () => { throw { code: 'not_found', message: 'Service not found' }; }));
    expect(await gw.execute(buildCall('light.a', { type: 'toggle' })))
      .toEqual({ ok: false, reason: 'error', message: 'Servizio non disponibile in Home Assistant' });
  });

  it('la sola lettura non invia nulla', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    expect(readOnlyGateway.enabled).toBe(false);
    expect(await readOnlyGateway.execute(buildCall('light.a', { type: 'toggle' }))).toMatchObject({ ok: false, reason: 'read-only' });
  });
});
