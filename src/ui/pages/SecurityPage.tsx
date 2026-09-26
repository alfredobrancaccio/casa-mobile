import { house, states } from '../../app/store';
import type { EntityInfo } from '../../model/house';
import { securityReport } from '../../model/status';
import { stateText } from '../entityVisual';
import { TileGrid } from '../components/EntityTile';
import { Icon } from '../components/Icon';
import { List, ListRow } from '../components/ListRow';
import { PageHeader, Section } from '../components/Page';
import { FROM_MORE } from '../moreMenu';

/** Sicurezza: stato dell'allarme Risco, aperture, grate e sensori. Sola lettura. */
export function SecurityPage() {
  const h = house.value!;
  const st = states.value;
  const r = securityReport(h, st);
  const alarmText = r.alarm ? stateText(r.alarm, st[r.alarm.id]) : null;
  const armed = !!r.alarm && st[r.alarm.id]?.state !== 'disarmed';
  const summary = r.triggered
    ? 'Allarme in corso'
    : r.leaks.length
      ? 'Acqua rilevata'
      : r.openPerimeter.length
        ? `${r.openPerimeter.length} ${r.openPerimeter.length === 1 ? 'apertura' : 'aperture'} verso l’esterno`
        : 'Aperture verso l’esterno chiuse';
  const ids = (list: EntityInfo[]) => list.map((e) => e.id);

  return (
    <>
      <PageHeader title="Sicurezza." back={FROM_MORE} />
      <div class={`card security-hero${r.critical ? ' security-hero--critical' : ''}`} role="status">
        <span class="security-hero__icon" aria-hidden="true">
          <Icon name={r.critical ? 'shieldAlert' : armed ? 'shieldOk' : 'shieldHome'} size="feature" />
        </span>
        <div>
          {alarmText && <p class="security-hero__state">Allarme {alarmText.toLowerCase()}</p>}
          <p class="security-hero__summary">{summary}</p>
        </div>
      </div>
      <p class="note">
        <Icon name="lock" size="inline" /> Sola consultazione: inserimento e disinserimento non sono disponibili da qui.
      </p>

      {(r.openPerimeter.length > 0 || r.leaks.length > 0) && (
        <Section title="Da guardare">
          <List>
            {r.leaks.map((e) => (
              <ListRow key={e.id} icon="leak" tone="critical" title="Acqua rilevata" detail={h.areaName(e.areaId)} href={`#/stanze/${e.areaId}`} />
            ))}
            {r.openPerimeter.map((e) => (
              <ListRow key={e.id} icon="windowOpen" tone="warning" title={`${e.name} aperta`} detail={h.areaName(e.areaId)} href={`#/stanze/${e.areaId}`} />
            ))}
          </List>
        </Section>
      )}

      {r.anomalies.length > 0 && (
        <Section title="Sensori da verificare" size="small">
          <List>
            {r.anomalies.map(({ info, reason }) => (
              <ListRow key={info.id} icon="warning" tone="warning" title={info.name} detail={`${h.areaName(info.areaId)} · ${reason}`} />
            ))}
          </List>
        </Section>
      )}

      {r.perimeter.length > 0 && (
        <Section title="Porte e finestre verso l’esterno">
          <TileGrid ids={ids(r.perimeter)} showArea />
        </Section>
      )}
      {r.internalDoors.length > 0 && (
        <Section title="Porte interne">
          <TileGrid ids={ids(r.internalDoors)} showArea />
        </Section>
      )}
      {r.contacts.length > 0 && (
        <Section title="Grate e sensori d’allarme">
          <TileGrid ids={ids(r.contacts)} showArea />
        </Section>
      )}
      {r.leakSensors.length > 0 && (
        <Section title="Perdite d’acqua">
          <TileGrid ids={ids(r.leakSensors)} showArea />
        </Section>
      )}
    </>
  );
}
