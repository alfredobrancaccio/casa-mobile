import type { JSX } from 'preact';
import { house, now, profile, source, states } from '../../app/store';
import { headerContext } from '../../model/context';
import { fmtLongDate } from '../../model/entity';
import { readPower } from '../../model/energy';
import { type HomeSection, homeLayout } from '../../model/home';
import { familyPresence, readPersonal } from '../../model/profile';
import { ContextChips, EnergySummary, FamilyStrip } from '../components/HomeParts';
import { Section } from '../components/Page';
import { QuickActions } from '../components/QuickActions';
import { RoomCard, RoomList } from '../components/RoomCard';
import { Weather } from '../components/Weather';

function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Buongiorno';
  if (hour >= 12 && hour < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export function HomePage() {
  const h = house.value!;
  const p = profile.value;
  const st = states.value;
  const t = now.value;
  const reg = source.value!.registries;
  const layout = homeLayout(p, h, st);

  // Dati del telefono: solo quelli del profilo corrente, mai di altri; il profilo Casa non ne ha.
  const phone = p.kind === 'person' ? p.devices.find((d) => d.primary) : undefined;
  const personal = phone ? readPersonal(phone, reg.entities, st, t) : null;
  const family = familyPresence(p, reg.entities, st, t);
  const power = readPower(st);
  const [main, ...others] = layout.personal;

  const render: Record<HomeSection, () => JSX.Element | null> = {
    header: () => (
      <header class="hero" key="header">
        <p class="eyebrow">{fmtLongDate(new Date(t))}</p>
        <h1 class="hero__title">
          {p.displayName ? `${greeting(new Date(t).getHours())}, ${p.displayName}.` : 'Casa.'}
        </h1>
        <Weather />
        <ContextChips items={headerContext(st, personal, t)} />
      </header>
    ),
    family: () =>
      family.length ? (
        <Section key="family" title="In famiglia" size="small">
          <FamilyStrip members={family} />
        </Section>
      ) : null,
    personal: () =>
      main ? (
        <Section key="personal" title="Le tue stanze">
          <div class="personal-rooms">
            <RoomCard room={main} variant="main" />
            {others.length > 0 && (
              <div class="room-grid">
                {others.map((r) => (
                  <RoomCard key={r.id} room={r} />
                ))}
              </div>
            )}
          </div>
        </Section>
      ) : null,
    shortcuts: () =>
      layout.shortcuts.length ? (
        <Section key="shortcuts" title="Scorciatoie" size="small">
          <QuickActions items={layout.shortcuts} primaryArea={layout.primaryArea} />
        </Section>
      ) : null,
    common: () =>
      layout.common.length ? (
        <Section key="common" title="Stanze comuni">
          <RoomList rooms={layout.common} />
        </Section>
      ) : null,
    energy: () =>
      power.home !== null ? (
        <Section key="energy" title="Energia">
          <EnergySummary power={power} />
        </Section>
      ) : null,
  };

  return <>{layout.sections.map((s) => render[s]())}</>;
}
