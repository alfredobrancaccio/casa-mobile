#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Crea un'istantanea REALE e ripulita di Home Assistant per sviluppare la UI
senza login (modalita demo, solo `npm run dev`).

SOLA LETTURA: usa esclusivamente comandi di lettura della WebSocket API
(registry, get_states, statistiche, previsioni meteo, elementi delle liste).
Riusa il client di ha_tools/ha_aree.py, senza modificarlo.

Il token e letto da --token-file e non viene mai stampato ne salvato.
Dall'istantanea vengono rimossi coordinate, indirizzi di rete, immagini con
token e qualsiasi attributo potenzialmente sensibile.

Uso:
  py tools/make_snapshot.py --token-file ../../HA/.ha_token
"""

import argparse
import datetime
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(HERE, '..', '..', 'ha_tools')))
sys.dont_write_bytecode = True
from ha_aree import HA  # noqa: E402

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OUT = os.path.normpath(os.path.join(HERE, '..', 'dev-data', 'snapshot.json'))

# Entita il cui STATO e di per se sensibile: escluse del tutto
DROP_SUFFIX = ('_ssid', '_bssid', '_ip_address', '_ipv6_addresses', 'geocoded_location',
               'public_ip_address', '_ip_esterno', '_sim_1', '_sim_2')
DROP_EXACT = {'sensor.iss_osservatore'}
# Attributi rimossi da ogni stato
DROP_ATTR = {'latitude', 'longitude', 'gps_accuracy', 'altitude', 'vertical_accuracy',
             'entity_picture', 'entity_picture_local', 'access_token', 'ip_address',
             'Location', 'location', 'address', 'ssid', 'bssid', 'media_image_url',
             'media_content_id', 'Name', 'Postal Code', 'Thoroughfare', 'Sub Thoroughfare',
             'Locality', 'Sub Locality', 'Administrative Area', 'Sub Administrative Area',
             'Areas Of Interest', 'Country', 'ISO Country Code', 'Inland Water', 'Ocean',
             'origin', 'destination', 'centro', 'cluster', 'circuit_lat', 'circuit_long'}

TEMP_HUM = [
    'sensor.sensore_t_h_alfredo_temperatura', 'sensor.sensore_t_h_alfredo_umidita',
    'sensor.t_h_padronale_temperatura', 'sensor.t_h_padronale_umidita',
    'sensor.sensore_t_h_3_temperatura', 'sensor.sensore_t_h_3_umidita',
    'sensor.t_h_salotto_temperatura', 'sensor.t_h_salotto_umidita',
]
ENERGY = [
    'sensor.tesla_powerwall_importa_sito', 'sensor.tesla_powerwall_esporta_sito',
    'sensor.tesla_powerwall_esporta_solare', 'sensor.tesla_powerwall_esporta_batteria',
    'sensor.tesla_powerwall_importa_batteria',
]


def keep_state(s):
    eid = s['entity_id']
    if eid in DROP_EXACT or eid.endswith(DROP_SUFFIX):
        return None
    attrs = {k: v for k, v in s['attributes'].items() if k not in DROP_ATTR}
    return {'entity_id': eid, 'state': s['state'], 'attributes': attrs,
            'last_changed': s['last_changed'], 'last_updated': s['last_updated']}


def forecast(ha, entity_id, kind):
    """Legge una sola volta le previsioni via sottoscrizione, poi la chiude."""
    ha._id += 1
    sub_id = ha._id
    ha.ws.send({'id': sub_id, 'type': 'weather/subscribe_forecast',
                'entity_id': entity_id, 'forecast_type': kind})
    result = None
    for _ in range(20):
        msg = ha.ws.recv()
        if msg.get('id') == sub_id and msg.get('type') == 'event':
            result = msg['event'].get('forecast')
            break
    ha.cmd('unsubscribe_events', subscription=sub_id)
    return result or []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--host', default='172.16.137.20')
    ap.add_argument('--port', type=int, default=8123)
    ap.add_argument('--token-file', required=True)
    args = ap.parse_args()

    with io.open(args.token_file, 'r', encoding='utf-8') as fh:
        token = fh.read().strip()
    ha = HA(args.host, args.port, token)
    token = None

    now = datetime.datetime.now(datetime.timezone.utc)
    iso = lambda d: d.isoformat()  # noqa: E731

    areas = [{'area_id': a['area_id'], 'name': a['name'], 'icon': a.get('icon')}
             for a in ha.cmd('config/area_registry/list')]
    devices = [{k: d.get(k) for k in ('id', 'name', 'name_by_user', 'area_id', 'manufacturer', 'model')}
               for d in ha.cmd('config/device_registry/list')]
    entities = ha.cmd('config/entity_registry/list_for_display')
    states = [x for x in (keep_state(s) for s in ha.cmd('get_states')) if x]
    kept = {s['entity_id'] for s in states}
    entities['entities'] = [e for e in entities['entities'] if e['ei'] in kept]

    stats_hour = ha.cmd('recorder/statistics_during_period',
                        start_time=iso(now - datetime.timedelta(hours=48)),
                        statistic_ids=TEMP_HUM, period='hour', types=['mean', 'min', 'max'])
    local_midnight = datetime.datetime.now().astimezone().replace(hour=0, minute=0, second=0, microsecond=0)
    stats_day = ha.cmd('recorder/statistics_during_period',
                       start_time=iso(local_midnight - datetime.timedelta(days=7)),
                       statistic_ids=ENERGY, period='day', types=['change'])
    daily = forecast(ha, 'weather.forecast_casa', 'daily')
    todo = {'todo.lista_della_spesa': ha.cmd('todo/item/list', entity_id='todo.lista_della_spesa').get('items', [])}
    ha.close()

    snap = {
        'captured_at': iso(now),
        'ha_version': ha.version,
        'areas': areas,
        'devices': devices,
        'entities': entities,
        'states': states,
        'statistics': {'hour': stats_hour, 'day': stats_day},
        'forecast': {'weather.forecast_casa': {'daily': daily}},
        'todo': todo,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with io.open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(snap, fh, ensure_ascii=False)
    print('Istantanea scritta: %s (%d stati, %d entita, %d dispositivi)'
          % (OUT, len(states), len(entities['entities']), len(devices)))


if __name__ == '__main__':
    main()
