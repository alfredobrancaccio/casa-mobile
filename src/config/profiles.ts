// PROFILI DELLA DASHBOARD
//
//   account HA (auth/current_user.id) -> profilo -> dispositivi personali
//
// Le aree personali NON stanno qui: derivano dai proprietari definiti in config/house.ts (AREAS).
// Le scorciatoie NON stanno qui: le genera model/shortcuts.ts dalle aree del profilo.
// I profili decidono ordine, contenuti e scorciatoie. NON limitano cio che si puo controllare:
// tutti vedono e comandano tutta la casa.
//
// I dispositivi personali sono collegati per device_id: le entita (batteria, tracker, sveglia...)
// vengono ricavate automaticamente. Per sostituire un telefono basta cambiare `haDeviceId`.

export type DeviceRole = 'phone' | 'tablet' | 'wearable';

export interface PersonalDevice {
  key: string;
  role: DeviceRole;
  label: string;
  haDeviceId: string;
  /** Dispositivo principale: fornisce presenza e dati personali in Home. */
  primary?: boolean;
  /** Entita forzate a mano per una capability, solo se il rilevamento automatico non basta. */
  overrides?: Partial<Record<Capability, string>>;
}

export interface Profile {
  id: string;
  kind: 'person' | 'shared';
  /** Nome nel saluto. null per i profili condivisi. */
  displayName: string | null;
  haUserIds: string[];
  devices: PersonalDevice[];
}

export const PROFILES: Profile[] = [
  {
    id: 'alfredo',
    kind: 'person',
    displayName: 'Alfredo',
    haUserIds: ['4aca2dbb466545c7bda8975b6d57c0b3'],
    devices: [
      { key: 'phone', role: 'phone', label: 'Samsung S21+', primary: true, haDeviceId: 'bbf73dc3890046c6688c9a7b9c04cc15' },
      // Probabilmente di Alfredo, non primario: solo in Dispositivi personali.
      { key: 'tablet', role: 'tablet', label: 'iPad', haDeviceId: '189f59ff7280b3660af7a5239fd88863' },
    ],
  },
  {
    id: 'giacomo',
    kind: 'person',
    displayName: 'Giacomo',
    haUserIds: ['0f5c0e43223c40c285f9a13c92ea97d0'],
    devices: [],
  },
  {
    id: 'elisabetta',
    kind: 'person',
    displayName: 'Elisabetta',
    haUserIds: ['0ea5b542caac4d4191f9030ee9ba2b32'],
    devices: [
      { key: 'phone', role: 'phone', label: 'iPhone', primary: true, haDeviceId: 'e0d60a11c098567a53848d79f9fa061d' },
    ],
  },
  {
    id: 'salvatore',
    kind: 'person',
    displayName: 'Salvatore',
    haUserIds: ['3291eeec7ccc40a9b352eb8386cf6de8'],
    devices: [],
  },
  {
    // Profilo neutro: tablet dell'ingresso, account Pikko e qualsiasi account non riconosciuto.
    id: 'casa',
    kind: 'shared',
    displayName: null,
    haUserIds: [
      '476e201077034884ba4e8890a3875ab0', // tablet_ingresso
      '9f4f9566bec9498e8aedd51df1ec398c', // pikko: non associato a una persona finche non confermato
    ],
    devices: [],
  },
];

export const FALLBACK_PROFILE_ID = 'casa';

/** Tablet condiviso: compare solo in Stato e manutenzione. */
export const SHARED_DEVICES: PersonalDevice[] = [
  { key: 'tablet_ingresso', role: 'tablet', label: 'Tablet ingresso', haDeviceId: '5715af36b3ad555e8d926c8af08e0297' },
];

// ---------------------------------------------------------------------------
// Capability dei dispositivi personali: come riconoscerle e quanto a lungo fidarsi.

export type Capability = 'battery' | 'charging' | 'tracker' | 'nextAlarm' | 'activity' | 'steps' | 'sleep';

export interface CapabilityRule {
  domain: string;
  /** Suffissi dell'entity_id accettati, in ordine di preferenza. */
  suffixes?: string[];
  deviceClass?: string;
  /** Oltre questa eta (ore) il dato non e considerato affidabile. */
  maxAgeHours: number;
}

export const CAPABILITIES: Record<Capability, CapabilityRule> = {
  battery: { domain: 'sensor', deviceClass: 'battery', suffixes: ['_battery_level'], maxAgeHours: 12 },
  charging: { domain: 'sensor', suffixes: ['_battery_state'], maxAgeHours: 12 },
  tracker: { domain: 'device_tracker', maxAgeHours: 24 },
  nextAlarm: { domain: 'sensor', suffixes: ['_next_alarm'], maxAgeHours: 72 },
  activity: { domain: 'sensor', suffixes: ['_detected_activity', '_activity'], maxAgeHours: 6 },
  steps: { domain: 'sensor', suffixes: ['_daily_steps', '_steps_sensor', '_steps'], maxAgeHours: 12 },
  sleep: { domain: 'sensor', suffixes: ['_sleep_segment'], maxAgeHours: 36 },
};

/** Soglia di batteria bassa per telefoni e sensori. */
export const LOW_BATTERY = 20;
