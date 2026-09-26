import { ICON_SIZE, ICONS, type IconName, type IconSize } from '../icons';

interface Props {
  name: IconName;
  /** Ruolo dimensionale (vedi ICON_SIZE); mai valori in pixel nei componenti. */
  size?: IconSize;
  /** Se presente l'icona e significativa e viene annunciata; altrimenti e decorativa. */
  label?: string;
  class?: string;
}

export function Icon({ name, size = 'control', label, class: cls }: Props) {
  const px = ICON_SIZE[size];
  return (
    <svg
      class={cls ? `icon ${cls}` : 'icon'}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      <path d={ICONS[name]} fill="currentColor" />
    </svg>
  );
}
