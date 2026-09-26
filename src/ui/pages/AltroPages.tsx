// Pagine raggiungibili dal menu "Altro": funzioni secondarie o occasionali, tutte con dati reali.
import { useEffect, useState } from 'preact/hooks';
import { connection, controlsEnabled, forecast, house, now, profile, source, states } from '../../app/store';
import { setTheme, theme, type ThemeChoice } from '../../app/theme';
import { APP_VERSION } from '../../app/version';
import { HOUSE, INFO, NETWORK } from '../../config/house';
import { type PersonalDevice, SHARED_DEVICES } from '../../config/profiles';
import type { TodoItem } from '../../ha/types';
import {
  fmtDuration, fmtNumber, fmtPercent, fmtTemp, fmtTime, fmtWeekday, fmtWhen, isAvailable, numeric,
} from '../../model/entity';
import { type PersonalData, readPersonal } from '../../model/profile';
import { maintenanceReport } from '../../model/status';
import { Icon } from '../components/Icon';
import { List, ListRow } from '../components/ListRow';
import { PageHeader, Section } from '../components/Page';
import { FROM_MORE } from '../moreMenu';
import { CONDITIONS, Weather } from '../components/Weather';

const personalOf = (d: PersonalDevice) => readPersonal(d, source.value!.registries.entities, states.value, now.value);

// --------------------------------------------------------------- I miei dispositivi

function personalRows(d: PersonalData, t: number) {
  const rows = [];
  if (d.battery !== undefined) {
    rows.push(
      <ListRow key="bat" icon={d.charging ? 'charging' : d.battery < 20 ? 'batteryLow' : 'battery'} title="Batteria"
        value={fmtPercent(d.battery)} detail={d.charging ? 'In carica' : undefined} />,
    );
  }
  if (d.presence) {
    const where = d.presence.at === 'home' ? 'In casa' : d.presence.at === 'away' ? 'Fuori casa' : d.presence.name;
    rows.push(<ListRow key="pres" icon={d.presence.at === 'home' ? 'atHome' : 'away'} title="Presenza" value={where} />);
  }
  if (d.nextAlarm) rows.push(<ListRow key="alarm" icon="alarm" title="Prossima sveglia" value={fmtWhen(d.nextAlarm, t)} />);
  if (d.activity) rows.push(<ListRow key="act" icon="walk" title="Attività" value={d.activity} />);
  if (d.steps !== undefined) rows.push(<ListRow key="steps" icon="walk" title="Passi oggi" value={fmtNumber(d.steps, 0)} />);
  if (d.sleep) {
    rows.push(<ListRow key="sleep" icon="sleep" title="Ultimo sonno rilevato" value={fmtDuration(d.sleep.minutes)} detail={`Fino alle ${fmtTime(d.sleep.end)}`} />);
  }
  return rows;
}

/** Dati dei dispositivi del SOLO profilo corrente. */
export function PersonalPage() {
  const t = now.value;
  const devices = profile.value.devices.map(personalOf).map((d) => ({ d, rows: personalRows(d, t) })).filter((x) => x.rows.length);
  return (
    <>
      <PageHeader title="I miei dispositivi." back={FROM_MORE} />
      {devices.length === 0 && <p class="note">Nessun dato recente dai tuoi dispositivi.</p>}
      {devices.map(({ d, rows }) => (
        <Section key={d.device.key} title={d.device.label}>
          <List>{rows}</List>
        </Section>
      ))}
      <p class="note">I dati compaiono solo quando sono recenti e affidabili. Sono visibili soltanto a te.</p>
    </>
  );
}

// --------------------------------------------------------------- Stato e manutenzione

export function StatusPage() {
  const h = house.value!;
  const r = maintenanceReport(h, source.value!.registries, states.value);
  const shared = SHARED_DEVICES.map(personalOf).filter((d) => d.battery !== undefined);
  const nothing = !r.unreliable.length && !r.lowBattery.length && !r.offline.length;
  return (
    <>
      <PageHeader title="Stato e manutenzione." back={FROM_MORE} />
      {nothing && <p class="note">Nessun problema tecnico rilevato.</p>}
      {r.unreliable.length > 0 && (
        <Section title="Da verificare">
          <List>
            {r.unreliable.map(({ info, reason }) => (
              <ListRow key={info.id} icon="warning" tone="warning" title={info.name} detail={`${h.areaName(info.areaId)} · ${reason}`} />
            ))}
          </List>
        </Section>
      )}
      {r.lowBattery.length > 0 && (
        <Section title="Batterie basse">
          <List>
            {r.lowBattery.map((b) => <ListRow key={b.key} icon="batteryLow" tone="warning" title={b.name} value={b.value} />)}
          </List>
        </Section>
      )}
      {r.offline.length > 0 && (
        <Section title="Non raggiungibili">
          <List>
            {r.offline.map((e) => <ListRow key={e.id} icon="offline" title={e.name} detail={h.areaName(e.areaId)} />)}
          </List>
        </Section>
      )}
      {shared.length > 0 && (
        <Section title="Dispositivi condivisi" size="small">
          <List>
            {shared.map((d) => {
              const low = d.battery! < 20 && !d.charging;
              return (
                <ListRow key={d.device.key} icon={low ? 'batteryLow' : 'tablet'} tone={low ? 'warning' : 'neutral'}
                  title={d.device.label} value={fmtPercent(d.battery!)} detail={d.charging ? 'In carica' : undefined} />
              );
            })}
          </List>
        </Section>
      )}
      {r.legacy.length > 0 && (
        <Section title="Ignorati dalla dashboard" size="small">
          <List>{r.legacy.map((name) => <ListRow key={name} icon="info" title={name} />)}</List>
        </Section>
      )}
      <p class="note">I sensori di porte, finestre e allarme sono in Sicurezza.</p>
    </>
  );
}

// --------------------------------------------------------------- Meteo e ambiente

const ALERT_LABEL: Record<string, string> = { verde: 'Nessuna allerta', gialla: 'Allerta gialla', arancione: 'Allerta arancione', rossa: 'Allerta rossa' };

export function WeatherPage() {
  const st = states.value;
  const days = forecast.value.slice(0, 5);
  const alert = st[HOUSE.weatherAlert];
  const air = st[INFO.airQuality];
  const airIndex = air?.attributes.indice as { nome?: string; determinante?: string } | undefined;
  const quakes = st[INFO.earthquakes];
  const travel = st[INFO.travel.entity];
  const minutes = numeric(travel);
  return (
    <>
      <PageHeader title="Meteo e ambiente." back={FROM_MORE} />
      <div class="card">
        <Weather />
      </div>
      {days.length > 0 && (
        <Section title="Prossimi giorni">
          <ul class="forecast">
            {days.map((d) => {
              const [icon, label] = CONDITIONS[d.condition ?? ''] ?? (['cloudy', ''] as const);
              return (
                <li key={d.datetime} class="forecast__day">
                  <span class="forecast__name">{fmtWeekday(new Date(d.datetime))}</span>
                  <Icon name={icon} size="control" label={label || undefined} />
                  <span class="forecast__temps num">
                    {typeof d.temperature === 'number' && <strong>{fmtTemp(d.temperature)}</strong>}
                    {typeof d.templow === 'number' && <span>{fmtTemp(d.templow)}</span>}
                  </span>
                  {typeof d.precipitation === 'number' && d.precipitation > 0 && (
                    <span class="forecast__rain num">{fmtNumber(d.precipitation, 1)} mm</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}
      <Section title="Ambiente">
        <List>
          {isAvailable(alert) && ALERT_LABEL[alert.state] && (
            <ListRow icon={alert.state === 'verde' ? 'ok' : 'warning'} tone={alert.state === 'verde' ? 'neutral' : 'warning'}
              title="Allerta meteo" value={ALERT_LABEL[alert.state]} detail={alert.attributes.zona as string | undefined} />
          )}
          {isAvailable(air) && airIndex?.nome && (
            <ListRow icon="leaf" title="Qualità dell’aria" value={airIndex.nome}
              detail={airIndex.determinante ? `Inquinante principale: ${airIndex.determinante}` : undefined} />
          )}
          {isAvailable(quakes) && (
            <ListRow icon="pulse" title="Terremoti rilevanti"
              value={quakes.state === '0' ? 'Nessuno' : quakes.state}
              detail={quakes.attributes.riferimento ? `Area di ${quakes.attributes.riferimento as string}` : undefined} />
          )}
          {minutes !== null && (
            <ListRow icon="car" title={`Tragitto verso ${INFO.travel.label}`} value={`${Math.round(minutes)} min`}
              detail={typeof travel?.attributes.route === 'string' ? travel.attributes.route : undefined} />
          )}
        </List>
      </Section>
    </>
  );
}

// --------------------------------------------------------------- Lista della spesa

export function ShoppingPage() {
  const [items, setItems] = useState<TodoItem[] | null>(null);
  useEffect(() => source.value?.subscribeTodo(INFO.shoppingList, setItems), []);
  const open = items?.filter((i) => i.status === 'needs_action') ?? [];
  const done = items?.filter((i) => i.status === 'completed') ?? [];
  return (
    <>
      <PageHeader title="Lista della spesa." back={FROM_MORE} />
      {items === null && <p class="note">Caricamento…</p>}
      {items !== null && open.length === 0 && <p class="note">La lista è vuota.</p>}
      {open.length > 0 && (
        <Section title="Da comprare">
          <List>{open.map((i) => <ListRow key={i.uid} icon="cart" title={i.summary} />)}</List>
        </Section>
      )}
      {done.length > 0 && (
        <Section title="Già presi" size="small">
          <List>{done.map((i) => <ListRow key={i.uid} icon="ok" title={i.summary} />)}</List>
        </Section>
      )}
      <p class="note">Consultazione: la lista si modifica da Alexa o da Home Assistant.</p>
    </>
  );
}

// --------------------------------------------------------------- Rete e connessione

export function NetworkPage() {
  const st = states.value;
  const t = now.value;
  const wan = st[NETWORK.wan];
  const down = numeric(st[NETWORK.download]);
  const up = numeric(st[NETWORK.upload]);
  const ping = numeric(st[NETWORK.ping]);
  const measured = st[NETWORK.download]?.last_updated;
  return (
    <>
      <PageHeader title="Rete e connessione." back={FROM_MORE} />
      <Section title="Internet">
        <List>
          {isAvailable(wan) && (
            <ListRow icon={wan.state === 'on' ? 'ok' : 'offline'} tone={wan.state === 'on' ? 'neutral' : 'critical'}
              title="Connessione a Internet" value={wan.state === 'on' ? 'Attiva' : 'Assente'} />
          )}
          {down !== null && <ListRow icon="speed" title="Download" value={`${fmtNumber(down, 0)} Mbit/s`} />}
          {up !== null && <ListRow icon="speed" title="Upload" value={`${fmtNumber(up, 0)} Mbit/s`} />}
          {ping !== null && <ListRow icon="pulse" title="Latenza" value={`${fmtNumber(ping, 0)} ms`} />}
        </List>
        {measured && down !== null && <p class="note">Ultima misura {fmtWhen(new Date(measured), t)}.</p>}
      </Section>
      <Section title="Home Assistant">
        <List>
          <ListRow icon={connection.value === 'ready' ? 'ok' : 'offline'} title="Collegamento"
            value={source.value?.kind === 'demo' ? 'Istantanea di sviluppo' : connection.value === 'ready' ? 'Attivo' : 'Riconnessione…'} />
        </List>
      </Section>
    </>
  );
}

// --------------------------------------------------------------- Impostazioni

const THEMES: { id: ThemeChoice; label: string }[] = [
  { id: 'auto', label: 'Automatico' },
  { id: 'light', label: 'Chiaro' },
  { id: 'dark', label: 'Scuro' },
];

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Impostazioni." back={FROM_MORE} />
      <Section title="Aspetto">
        <div class="segmented" role="group" aria-label="Tema">
          {THEMES.map((th) => (
            <button key={th.id} type="button" class="segmented__item" aria-pressed={theme.value === th.id} onClick={() => setTheme(th.id)}>
              {th.label}
            </button>
          ))}
        </div>
        <p class="note">La scelta vale per questo dispositivo. «Automatico» segue il sistema.</p>
      </Section>
      <Section title="Controlli">
        <List>
          <ListRow icon="lock" title={controlsEnabled ? 'Controlli attivi' : 'Sola lettura'}
            detail={controlsEnabled ? undefined : 'I comandi vengono preparati ma non inviati a Home Assistant.'} />
        </List>
      </Section>
    </>
  );
}

// --------------------------------------------------------------- Informazioni

export function InfoPage() {
  const p = profile.value;
  const src = source.value!;
  return (
    <>
      <PageHeader title="Informazioni." back={FROM_MORE} />
      <List>
        <ListRow icon="home" title="Profilo" value={p.displayName ?? 'Casa'} detail={p.kind === 'shared' ? 'Profilo condiviso, senza dati personali' : undefined} />
        <ListRow icon="info" title="Account Home Assistant" value={src.user.name} />
        <ListRow icon="network" title="Dati" value={src.kind === 'demo' ? 'Istantanea di sviluppo' : 'Tempo reale'} />
        <ListRow icon="lock" title="Modalità" value={controlsEnabled ? 'Controlli attivi' : 'Sola lettura'} />
        <ListRow icon="devices" title="Versione" value={APP_VERSION} />
      </List>
    </>
  );
}
