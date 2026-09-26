import { house, profile, states } from '../../app/store';
import { href } from '../../app/router';
import { HOUSE } from '../../config/house';
import { isActive } from '../../model/entity';
import type { EntityInfo, House, Room } from '../../model/house';
import { orderedRooms } from '../../model/profile';
import { CATEGORIES, categoryEntities, categorySummary } from '../../model/summary';
import { ClimateCard } from '../components/ClimateCard';
import { EntityTile, TileGrid } from '../components/EntityTile';
import { Icon } from '../components/Icon';
import { PageHeader, Section } from '../components/Page';
import { SceneChips } from '../components/SceneChips';
import { alt } from '../moreMenu';

export function DevicesPage() {
  const h = house.value!;
  const st = states.value;
  return (
    <>
      <PageHeader title="Dispositivi." />
      <div class="category-grid">
        {CATEGORIES.map((c) => (
          // La sicurezza ha una pagina dedicata (raggiungibile anche da Altro): nessun doppione.
          <a key={c.id} class="category-card" href={c.id === 'sicurezza' ? alt('sicurezza') : href('dispositivi', c.id)}>
            <span class="category-card__icon">
              <Icon name={c.icon} />
            </span>
            <span class="category-card__label">{c.label}</span>
            <span class="category-card__summary num">{categorySummary(h, c, st)}</span>
          </a>
        ))}
      </div>
    </>
  );
}

/** Raggruppa per stanza, nell'ordine del profilo; le entita dell'impianto vanno in fondo. */
function byRoom(h: House, rooms: Room[], list: EntityInfo[]) {
  const groups = rooms
    .map((r) => ({ key: r.id, title: r.name, ids: list.filter((e) => e.areaId === r.id).map((e) => e.id) }))
    .filter((g) => g.ids.length > 0);
  const rest = list.filter((e) => !rooms.some((r) => r.id === e.areaId));
  if (rest.length) groups.push({ key: 'impianto', title: h.areaName(rest[0].areaId) || 'Altro', ids: rest.map((e) => e.id) });
  return groups;
}

export function CategoryPage({ id }: { id: string }) {
  const h = house.value!;
  const st = states.value;
  const cat = CATEGORIES.find((c) => c.id === id);
  const back = { fallback: href('dispositivi') };
  if (!cat) return <PageHeader title="Categoria non trovata." back={back} />;

  const rooms = orderedRooms(profile.value, h.rooms);
  const list = categoryEntities(h, cat);

  if (cat.id === 'clima') return <ClimateCategory rooms={rooms} list={list} back={back} />;

  const active = list.filter((e) => isActive(st[e.id])).length;
  return (
    <>
      <PageHeader title={`${cat.label}.`} back={back}>
        <p class="page-lead num">{categorySummary(h, cat, st)}</p>
      </PageHeader>
      {cat.id === 'tapparelle' && h.byId.has(HOUSE.allCovers) && (
        <Section title="Tutta la casa">
          <div class="tile-grid">
            <EntityTile id={HOUSE.allCovers} />
          </div>
          <p class="note">Il comando collettivo esclude la tapparella del pranzo.</p>
        </Section>
      )}
      {cat.id === 'luci' && active > 0 && (
        <Section title="Accese ora">
          <TileGrid ids={list.filter((e) => isActive(st[e.id])).map((e) => e.id)} showArea />
        </Section>
      )}
      {byRoom(h, rooms, list).map((g) => (
        <Section key={g.key} title={g.title}>
          {cat.id === 'scene' ? <SceneChips ids={g.ids} /> : <TileGrid ids={g.ids} />}
        </Section>
      ))}
    </>
  );
}

function ClimateCategory({ rooms, list, back }: { rooms: Room[]; list: EntityInfo[]; back: { fallback: string } }) {
  const withClimate = rooms.filter((r) => r.temperature || list.some((e) => e.kind === 'climate' && e.areaId === r.id));
  return (
    <>
      <PageHeader title="Clima." back={back} />
      {withClimate.map((r) => {
        const thermostats = list.filter((e) => e.kind === 'climate' && e.areaId === r.id).map((e) => e.id);
        return (
          <Section key={r.id} title={r.name}>
            <ClimateCard room={r} />
            {thermostats.length > 0 && <TileGrid ids={thermostats} />}
          </Section>
        );
      })}
    </>
  );
}
