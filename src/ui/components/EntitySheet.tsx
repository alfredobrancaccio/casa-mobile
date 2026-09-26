import { useEffect, useRef, useState } from 'preact/hooks';
import { controlsEnabled, house, run, states } from '../../app/store';
import type { HassEntity } from '../../ha/types';
import { fmtTemp, isActive } from '../../model/entity';
import type { EntityInfo } from '../../model/house';
import { iconFor, stateText } from '../entityVisual';
import { detailEntity } from '../sheet';
import { closeDetail } from '../overlays';
import { Icon } from './Icon';

/** Pannello di dettaglio: dialog modale nativo (focus intrappolato, Esc per chiudere). */
export function EntitySheet() {
  const id = detailEntity.value;
  const ref = useRef<HTMLDialogElement>(null);
  const info = id ? house.value?.byId.get(id) : undefined;

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (info && !dlg.open) dlg.showModal();
    if (!info && dlg.open) dlg.close();
  }, [info]);

  const s = id ? states.value[id] : undefined;
  return (
    <dialog
      ref={ref}
      class="sheet"
      aria-labelledby="sheet-title"
      onClose={closeDetail}
      onClick={(e) => e.target === ref.current && closeDetail()}
    >
      {info && (
        <div class="sheet__panel">
          <header class="sheet__head">
            <span class={`sheet__icon ${isActive(s) ? 'is-active' : ''}`}>
              <Icon name={iconFor(info, s)} size="feature" />
            </span>
            <div class="sheet__titles">
              <h2 id="sheet-title" class="sheet__title">{info.name}</h2>
              <p class="sheet__sub">
                {[house.value?.areaName(info.areaId), stateText(info, s)].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button type="button" class="icon-button" onClick={closeDetail} aria-label="Chiudi">
              <Icon name="close" />
            </button>
          </header>
          <div class="sheet__body">
            <Controls info={info} s={s} />
          </div>
          {!controlsEnabled && (
            <p class="sheet__note">
              <Icon name="lock" size="inline" />
              Sola lettura: i comandi vengono preparati ma non inviati.
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}

function Controls({ info, s }: { info: EntityInfo; s: HassEntity | undefined }) {
  switch (info.kind) {
    case 'light':
      return <LightControls info={info} s={s} />;
    case 'cover':
      return <CoverControls info={info} s={s} />;
    case 'climate':
      return <ClimateControls info={info} s={s} />;
    case 'media':
      return <MediaControls info={info} s={s} />;
    default:
      return null;
  }
}

function PowerButton({ info, on }: { info: EntityInfo; on: boolean }) {
  return (
    <button
      type="button"
      class={`button button--block ${on ? 'button--primary' : ''}`}
      aria-pressed={on}
      onClick={() => run(info.id, { type: on ? 'turnOff' : 'turnOn' })}
    >
      <Icon name="power" size="row" />
      {on ? 'Spegni' : 'Accendi'}
    </button>
  );
}

function LightControls({ info, s }: { info: EntityInfo; s: HassEntity | undefined }) {
  const on = isActive(s);
  const current = on && Number(s?.attributes.brightness) > 0 ? Math.round((Number(s?.attributes.brightness) / 255) * 100) : 0;
  const [value, setValue] = useState(current || 50);
  useEffect(() => setValue(current || 50), [current]);
  return (
    <>
      <PowerButton info={info} on={on} />
      <div class="field">
        <label class="field__label" for="brightness">
          Luminosità <span class="num">{value}%</span>
        </label>
        <input
          id="brightness"
          class="range"
          type="range"
          min={1}
          max={100}
          value={value}
          onInput={(e) => setValue(Number((e.target as HTMLInputElement).value))}
          onChange={(e) => run(info.id, { type: 'brightness', percent: Number((e.target as HTMLInputElement).value) })}
        />
      </div>
      <div class="segmented" role="group" aria-label="Luminosità rapida">
        {[25, 50, 75, 100].map((p) => (
          <button key={p} type="button" class="segmented__item" onClick={() => run(info.id, { type: 'brightness', percent: p })}>
            {p}%
          </button>
        ))}
      </div>
    </>
  );
}

function CoverControls({ info, s }: { info: EntityInfo; s: HassEntity | undefined }) {
  const features = Number(s?.attributes.supported_features ?? 0);
  const canPosition = (features & 4) !== 0;
  const pos = s?.attributes.current_position;
  return (
    <>
      <div class="cover-buttons" role="group" aria-label={`Comandi ${info.name}`}>
        <button type="button" class="button" onClick={() => run(info.id, { type: 'coverOpen' })}>
          <Icon name="up" size="control" /> Su
        </button>
        <button type="button" class="button" onClick={() => run(info.id, { type: 'coverStop' })}>
          <Icon name="stop" size="control" /> Stop
        </button>
        <button type="button" class="button" onClick={() => run(info.id, { type: 'coverClose' })}>
          <Icon name="down" size="control" /> Giù
        </button>
      </div>
      {typeof pos === 'number' && (
        <p class="sheet__meta num">Posizione attuale: {pos}%</p>
      )}
      {canPosition && (
        <div class="segmented" role="group" aria-label="Posizione">
          {[0, 25, 50, 75, 100].map((p) => (
            <button key={p} type="button" class="segmented__item" onClick={() => run(info.id, { type: 'coverPosition', position: p })}>
              {p}%
            </button>
          ))}
        </div>
      )}
    </>
  );
}

const HVAC_LABELS: Record<string, string> = { off: 'Spento', heat: 'Riscalda', cool: 'Raffresca', auto: 'Auto', heat_cool: 'Auto', dry: 'Deumidifica', fan_only: 'Ventola' };

function ClimateControls({ info, s }: { info: EntityInfo; s: HassEntity | undefined }) {
  const a = s?.attributes ?? {};
  const current = Number(a.current_temperature);
  const target = Number(a.temperature);
  const step = Number(a.target_temp_step) || 0.5;
  const modes = (Array.isArray(a.hvac_modes) ? a.hvac_modes : []) as string[];
  const set = (t: number) => run(info.id, { type: 'climateTarget', temperature: Math.round(t / step) * step });
  return (
    <>
      <div class="thermo">
        {Number.isFinite(current) && (
          <div class="thermo__item">
            <span class="thermo__label">Ambiente</span>
            <span class="thermo__value num">{fmtTemp(current)}</span>
          </div>
        )}
        {Number.isFinite(target) && (
          <div class="thermo__item">
            <span class="thermo__label">Impostata</span>
            <div class="stepper">
              <button type="button" class="icon-button" onClick={() => set(target - step)} aria-label="Diminuisci temperatura">
                <Icon name="minus" />
              </button>
              <span class="thermo__value num" aria-live="polite">{fmtTemp(target)}</span>
              <button type="button" class="icon-button" onClick={() => set(target + step)} aria-label="Aumenta temperatura">
                <Icon name="plus" />
              </button>
            </div>
          </div>
        )}
      </div>
      {modes.length > 1 && (
        <div class="segmented" role="group" aria-label="Modalità">
          {modes.map((m) => {
            const selected = m === 'off' ? s?.state === 'off' : s?.state !== 'off' && (s?.state === m || modes.length === 2);
            return (
              <button key={m} type="button" class="segmented__item" aria-pressed={selected} onClick={() => run(info.id, { type: 'climateMode', mode: m })}>
                {HVAC_LABELS[m] ?? m}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function MediaControls({ info, s }: { info: EntityInfo; s: HassEntity | undefined }) {
  const on = isActive(s);
  const title = typeof s?.attributes.media_title === 'string' ? s.attributes.media_title : null;
  return (
    <>
      {title && <p class="sheet__meta">{title}</p>}
      <div class="cover-buttons" role="group" aria-label={`Comandi ${info.name}`}>
        <button type="button" class="button" onClick={() => run(info.id, { type: 'volumeDown' })} aria-label="Abbassa volume">
          <Icon name="volumeDown" size="control" />
        </button>
        <button type="button" class="button" onClick={() => run(info.id, { type: 'mediaPlayPause' })}>
          <Icon name={s?.state === 'playing' ? 'pause' : 'play'} size="control" />
          {s?.state === 'playing' ? 'Pausa' : 'Riproduci'}
        </button>
        <button type="button" class="button" onClick={() => run(info.id, { type: 'volumeUp' })} aria-label="Alza volume">
          <Icon name="volumeUp" size="control" />
        </button>
      </div>
      <PowerButton info={info} on={on} />
    </>
  );
}
