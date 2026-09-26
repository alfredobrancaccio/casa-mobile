import { now, states } from '../../app/store';
import { COUNTERS, GRID_METER } from '../../config/energy';
import { fmtEnergy, fmtNumber, fmtPercent, fmtPower, numeric } from '../../model/entity';
import { dailyTotals, hasPowerData, readPower, selfSufficiency } from '../../model/energy';
import { DailyBars } from '../components/DailyBars';
import { EnergyFlow } from '../components/EnergyFlow';
import { Icon } from '../components/Icon';
import { List, ListRow } from '../components/ListRow';
import { PageHeader, Section } from '../components/Page';
import { useStatistics } from '../useStatistics';

const COUNTER_IDS = Object.values(COUNTERS);

function startOfDay(t: number, daysBack: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysBack);
  return d.getTime();
}

export function EnergyPage() {
  const st = states.value;
  const power = readPower(st);
  const stats = useStatistics(COUNTER_IDS, 'day', startOfDay(now.value, 6), ['change']);
  const days = stats ? dailyTotals(stats) : [];
  const today = days.find((d) => d.start >= startOfDay(now.value, 0));
  const share = today ? selfSufficiency(today) : null;

  if (!hasPowerData(power)) {
    return (
      <>
        <PageHeader title="Energia." />
        <p class="note">I dati della Powerwall non sono raggiungibili in questo momento.</p>
      </>
    );
  }

  const voltage = numeric(st[GRID_METER.voltage]);
  const frequency = numeric(st[GRID_METER.frequency]);

  return (
    <>
      <PageHeader title="Energia.">
        <p class="energy-hero num">
          <span class="energy-hero__value">{fmtPower(power.home ?? 0)}</span>
          <span class="energy-hero__label">consumati ora dalla casa</span>
        </p>
      </PageHeader>

      <section class="card flow-card" aria-labelledby="flow-title">
        <h2 id="flow-title" class="sr-only">Flussi di energia</h2>
        <EnergyFlow power={power} />
      </section>

      {power.charge !== null && (
        <Section title="Batteria di casa">
          <div class="card battery-card">
            <div class="battery-card__row">
              <Icon name="homeBattery" size="feature" />
              <span class="battery-card__pct num">{fmtPercent(power.charge)}</span>
              <span class="battery-card__state">
                {power.battery === null || Math.abs(power.battery) < 20
                  ? 'Ferma'
                  : power.battery > 0
                    ? `In scarica · ${fmtPower(power.battery)}`
                    : `In carica · ${fmtPower(power.battery)}`}
              </span>
            </div>
            <div
              class="meter"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(power.charge)}
              aria-label="Carica della batteria"
            >
              <span class="meter__fill" style={{ width: `${power.charge}%` }} />
              {power.reserve !== null && <span class="meter__mark" style={{ left: `${power.reserve}%` }} />}
            </div>
            {power.reserve !== null && (
              <p class="battery-card__note num">Riserva per blackout: {fmtPercent(power.reserve)}</p>
            )}
          </div>
        </Section>
      )}

      {today && (
        <Section title="Oggi">
          <div class="stat-grid">
            <Stat icon="homePower" label="Consumo" value={fmtEnergy(today.home)} />
            <Stat icon="solar" label="Solare prodotto" value={fmtEnergy(today.solar)} />
            <Stat icon="grid" label="Dalla rete" value={fmtEnergy(today.gridIn)} />
            <Stat icon="grid" label="Ceduta alla rete" value={fmtEnergy(today.gridOut)} />
            {share !== null && <Stat icon="ok" label="Autosufficienza" value={fmtPercent(share * 100)} />}
          </div>
        </Section>
      )}

      {days.length > 1 && (
        <Section title="Ultimi 7 giorni">
          <div class="card">
            <DailyBars days={days} />
          </div>
        </Section>
      )}

      {(voltage !== null || frequency !== null || power.gridUp !== null) && (
        <Section title="Rete elettrica">
          <List>
            {power.gridUp !== null && (
              <ListRow icon="grid" tone={power.gridUp ? 'neutral' : 'critical'} title="Rete" value={power.gridUp ? 'Presente' : 'Assente'} />
            )}
            {voltage !== null && <ListRow icon="energy" title="Tensione" value={`${fmtNumber(voltage, 0)} V`} />}
            {frequency !== null && <ListRow icon="energy" title="Frequenza" value={`${fmtNumber(frequency, 2)} Hz`} />}
          </List>
        </Section>
      )}
    </>
  );
}

function Stat({ icon, label, value }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: string }) {
  return (
    <div class="stat">
      <Icon name={icon} size="row" />
      <span class="stat__label">{label}</span>
      <span class="stat__value num">{value}</span>
    </div>
  );
}
