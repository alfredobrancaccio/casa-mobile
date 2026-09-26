import { house, profile } from '../../app/store';
import { href } from '../../app/router';
import type { Kind } from '../../model/house';
import { roomGroups } from '../../model/profile';
import { ClimateCard } from '../components/ClimateCard';
import { TileGrid } from '../components/EntityTile';
import { PageHeader, Section } from '../components/Page';
import { RoomGrid } from '../components/RoomCard';
import { SceneChips } from '../components/SceneChips';

export function RoomsPage() {
  const h = house.value!;
  // Pagina completa: tutta la casa, comprese le stanze personali degli altri.
  const o = roomGroups(profile.value, h.rooms);
  return (
    <>
      <PageHeader title="Stanze." />
      {o.mine.length > 0 && (
        <Section title="Le tue stanze">
          <RoomGrid rooms={o.mine} />
        </Section>
      )}
      {o.common.length > 0 && (
        <Section title="Stanze comuni">
          <RoomGrid rooms={o.common} />
        </Section>
      )}
      {o.others.length > 0 && (
        <Section title={o.mine.length ? 'Altre camere e bagni' : 'Camere e bagni'}>
          <RoomGrid rooms={o.others} />
        </Section>
      )}
      {o.service.length > 0 && (
        <Section title="Servizio">
          <RoomGrid rooms={o.service} />
        </Section>
      )}
    </>
  );
}

/** Sezioni di una stanza, nell'ordine d'uso. Temperatura e umidita stanno nella card clima. */
const ROOM_SECTIONS: { title: string; kinds: Kind[] }[] = [
  { title: 'Luci', kinds: ['light'] },
  { title: 'Tapparelle', kinds: ['cover'] },
  { title: 'Riscaldamento', kinds: ['climate'] },
  { title: 'Prese e utenze', kinds: ['switch'] },
  { title: 'Media', kinds: ['media'] },
  { title: 'Scene', kinds: ['scene'] },
  { title: 'Sensori', kinds: ['opening', 'hatch', 'presence', 'leak'] },
];

export function RoomPage({ id }: { id: string }) {
  const h = house.value!;
  const room = h.rooms.find((r) => r.id === id);
  const back = { fallback: href('stanze') };
  if (!room) {
    return <PageHeader title="Stanza non trovata." back={back} />;
  }
  const sections = ROOM_SECTIONS.map((s) => ({
    ...s,
    ids: [
      ...room.entities.filter((e) => s.kinds.includes(e.kind)).map((e) => e.id),
      ...(s.title === 'Sensori' ? room.related.map((e) => e.id) : []),
    ],
  })).filter((s) => s.ids.length > 0);

  return (
    <>
      <PageHeader title={`${room.name}.`} back={back} />
      <ClimateCard room={room} />
      {sections.map((s) => (
        <Section key={s.title} title={s.title}>
          {s.kinds.includes('scene') ? <SceneChips ids={s.ids} /> : <TileGrid ids={s.ids} />}
        </Section>
      ))}
      {room.related.length > 0 && (
        <p class="note">
          {room.related.map((e) => `«${e.name}» appartiene a ${h.areaName(e.areaId)}: è mostrata qui come contesto.`).join(' ')}
        </p>
      )}
    </>
  );
}
