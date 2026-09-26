// CONFIGURAZIONE DELLA CASA — unico punto in cui compaiono gli entity_id specifici.
// Tutto il resto dell'app lavora su aree, domini e device_class ricavati dai registry di HA.
// Nulla qui modifica Home Assistant: e solo il modo in cui la dashboard presenta i dati.
import type { IconName } from '../ui/icons';

/**
 * Ruolo di un'area:
 * - private: di una persona o di una coppia (owners); fuori dalla Home degli altri
 * - shared_personal: condivisa da piu persone (owners); personale per loro, privata per gli altri
 * - common: rilevante per tutti
 * - service: accessibile a tutti, con poca rilevanza visiva
 * - technical: infrastruttura, fonte dati; mai una stanza
 * - ignored: non mostrata
 * I ruoli decidono solo la personalizzazione: ogni stanza resta raggiungibile da "Stanze".
 */
export type AreaRole = 'private' | 'shared_personal' | 'common' | 'service' | 'technical' | 'ignored';

export interface AreaConfig {
  role: AreaRole;
  icon: IconName;
  /** Id dei profili per cui l'area e personale (solo private e shared_personal). */
  owners?: string[];
  /** Nome breve per chip e card; se assente si usa il nome dell'area in HA. */
  short?: string;
}

/** Ruoli delle aree. L'ordine e quello della pagina Stanze e delle aree personali. */
export const AREAS: Record<string, AreaConfig> = {
  camera_alfredo: { role: 'private', owners: ['alfredo'], icon: 'bed', short: 'Alfredo' },
  camera_giacomo: { role: 'private', owners: ['giacomo'], icon: 'bed', short: 'Giacomo' },
  camera_da_letto: { role: 'private', owners: ['elisabetta', 'salvatore'], icon: 'bedKing', short: 'Padronale' },
  bagno_padronale: { role: 'private', owners: ['elisabetta', 'salvatore'], icon: 'shower' },
  bagno_ragazzi: { role: 'shared_personal', owners: ['alfredo', 'giacomo'], icon: 'shower' },
  corriodio_ragazzi: { role: 'shared_personal', owners: ['alfredo', 'giacomo'], icon: 'corridor', short: 'Corridoio' },
  soggiorno: { role: 'common', icon: 'sofa' },
  cucina: { role: 'common', icon: 'kitchen' },
  ingresso: { role: 'common', icon: 'entrance' },
  balconi: { role: 'common', icon: 'balcony' },
  bagno_servizio: { role: 'service', icon: 'toilet' },
  camera_servizio: { role: 'service', icon: 'laundry', short: 'Lavanderia' },
  etere: { role: 'technical', icon: 'wrench' }, // infrastruttura: fonte dati, mai una stanza
  garage: { role: 'ignored', icon: 'garage' }, // vuoto: omesso finche non contiene dispositivi
};

/**
 * Area da attribuire a entita che in HA non hanno area ne sull'entita ne sul dispositivo.
 * Si applica SOLO in quel caso: non sostituisce mai un'area assegnata in HA.
 * Vuoto: oggi nessuna entita senza area va attribuita a una stanza.
 */
export const AREA_OVERRIDES: Record<string, string> = {};

/** Entita mostrate anche in altre aree, senza cambiare l'assegnazione in HA. */
export const ALSO_SHOW_IN: Record<string, string[]> = {
  'binary_sensor.door_sensor_7_porta': ['corriodio_ragazzi'],
};

/** Entita che non vanno usate per conclusioni o avvisi importanti. */
export const UNRELIABLE: Record<string, string> = {
  'binary_sensor.door_sensor_7_porta': 'Fermo su «aperta» dal 24/09: sensore da verificare.',
};

/**
 * Rappresentazioni multiple dello stesso dispositivo. Si mostra solo la primaria;
 * per cambiarla basta scambiare i valori qui.
 */
export const DUPLICATES: { primary: string; secondary: string[] }[] = [
  { primary: 'media_player.soggiorno_android_tv_soggiorno',
    secondary: ['media_player.fire_tv_soggiorno', 'media_player.fire_tv_soggiorno_alexa_2'] },
  { primary: 'media_player.android_tv_172_16_137_38', secondary: ['media_player.fire_tv_di_alfredo_alexa_alexa'] },
  { primary: 'media_player.alfredo',
    secondary: ['media_player.echo_alfredo_voice_assistant', 'media_player.echo_alfredo_voice_assistant_2'] },
  { primary: 'media_player.soggiorno', secondary: ['media_player.zona_giorno'] },
  { primary: 'light.comodinodue', secondary: ['light.comodinodue_2'] },
  { primary: 'light.scrivania', secondary: ['light.scrivania_2'] },
  { primary: 'light.lytmi_neo_3_pro', secondary: ['light.lytmi_neo_3_pro_2'] },
  { primary: 'light.specchio_ragazzi_switch_2', secondary: ['switch.zigbee_2_gang_module_switch_2'] },
  { primary: 'switch.irrigazione_interruttore', secondary: ['valve.irrigazione_valve'] },
];

/** Gruppi: 'hidden' = si mostrano solo i membri; 'shortcut' = usabile solo come scorciatoia. */
export const GROUPS: Record<string, 'hidden' | 'shortcut'> = {
  'light.salotto': 'hidden',
  'light.letto_padronale': 'hidden',
  'light.atmosfera_alfredo': 'shortcut',
};

/** Entita escluse dalla vista normale (tecniche, portatili o estranee alla casa). */
export const HIDDEN: string[] = [
  'media_player.salvatore_s_bose_quietcomfort_35_ii', // cuffie portatili
];
export const HIDDEN_PATTERNS: RegExp[] = [
  /_amazon_kids$/, // modalita bambini Alexa
  /^binary_sensor\.termosifone_.+_finestra$/, // rilevamento "finestra aperta" interno ai termostati
  /^binary_sensor\.vibration_sensor_/, // sensore vibrazioni fuori servizio
];

/** Dispositivi legacy o inattivi: mai mostrati, mai usati per presenza o avvisi. */
export const LEGACY_DEVICES: Record<string, string> = {
  '0b95b4a2aa93141f273658f419733465': 'Samsung S20 «Pikko» (inattivo da settembre 2025)',
};

/** Aperture verso l'esterno: finestre, balconi, serranda. Contano per «Aperture» e sicurezza. */
export const PERIMETER: string[] = [
  'binary_sensor.porta_balcone_alfredo_porta',
  'binary_sensor.serranda_alfredo_porta',
  'binary_sensor.balcone_padronale_porta',
  'binary_sensor.finestra_padronale_porta',
  'binary_sensor.finestra_bagno_ragazzi_porta',
  'binary_sensor.door_sensor_6_porta',
  'binary_sensor.door_sensor_5_porta',
];

export const HOUSE = {
  weather: 'weather.forecast_casa',
  weatherAlert: 'sensor.pannello_allerta_meteo',
  alarm: 'sensor.inserimento_inserimento',
  allCovers: 'cover.tutte_le_tapparelle', // esclude di proposito la finestra del pranzo
};

/** Informazioni non domotiche gia presenti in HA, mostrate nelle pagine di "Altro". */
export const INFO = {
  shoppingList: 'todo.lista_della_spesa',
  airQuality: 'sensor.pannello_qualita_aria',
  earthquakes: 'sensor.pannello_terremoti',
  travel: { entity: 'sensor.waze_campus_bio_medico', label: 'Campus Bio-Medico' },
};

export const NETWORK = {
  wan: 'binary_sensor.fritz_box_7530_stato_della_wan',
  download: 'sensor.speedtest_scarica',
  upload: 'sensor.speedtest_carica',
  ping: 'sensor.speedtest_ping',
};

/** Nomi brevi e privi del nome della stanza (la stanza e gia indicata dal contesto). */
export const NAMES: Record<string, string> = {
  // Camera Alfredo
  'light.faretti_alfredo': 'Faretti',
  'light.lampada_monitor_alfredo_light_bar': 'Lampada monitor',
  'light.led_letto_alfredo_led_letto_alfredo': 'Led letto',
  'light.lytmi_neo_3_pro': 'Ambilight',
  'light.smart_light_strip': 'Striscia scrivania',
  'light.smart_light_strip_2': 'Sotto letto',
  'light.zb3_0_dim': 'Luce letto',
  'light.atmosfera_alfredo': 'Atmosfera',
  'cover.balcone_alfredo': 'Tapparella balcone',
  'media_player.android_tv_172_16_137_38': 'Fire TV',
  'media_player.tv_alfredo': 'TV',
  'media_player.alfredo': 'Echo',
  'binary_sensor.porta_alfredo_porta': 'Porta',
  'binary_sensor.porta_balcone_alfredo_porta': 'Finestra balcone',
  'binary_sensor.serranda_alfredo_porta': 'Serranda',
  'binary_sensor.sensore_presenza_alfredo_movimento': 'Movimento',
  'binary_sensor.letto_alfredo_a': 'Letto',
  'binary_sensor.sedia_alfredo_pressione': 'Sedia',
  'binary_sensor.aria_condizionata_alfredo_porta': 'Sportello condizionatore',
  'binary_sensor.tapparella_alfredo_tapparella_alfredo': 'Contatto tapparella',
  'binary_sensor.tapperella_alfredo_tapperella_alfredo': 'Contatto tapparella 2',
  'scene.ac_22deg_silenzioso': 'Clima 22°',
  'scene.ac_23deg_silenzioso': 'Clima 23°',
  'scene.ac_24deg_silenzioso': 'Clima 24°',
  'scene.ac_25deg_silenzioso': 'Clima 25°',
  'scene.ac_26deg_silenzioso': 'Clima 26°',
  'scene.ac_dehumy_silenzioso': 'Deumidifica',
  'scene.ac_spegnimento': 'Clima spento',
  'scene.film_mode': 'Film',
  'scene.led_scrivania_alfredo_ambilight': 'Scrivania ambilight',
  'scene.led_scrivania_alfredo_normale': 'Scrivania normale',
  'scene.striscia_led_alfredo_off': 'Strisce spente',
  'scene.striscia_led_letto_alfredo_accesa_bassa': 'Letto soffuso',
  'scene.striscia_sotto_letto_alfredo_ambilight': 'Sotto letto ambilight',
  // Camera Giacomo
  'light.faretti_giacomo': 'Faretti',
  'light.giacomo_led_letto': 'Led letto',
  'light.veletta_giacomo': 'Veletta',
  'cover.finestra_giacomo': 'Tapparella finestra',
  'media_player.fire_tv_di_giacomo_alexa': 'Fire TV',
  'media_player.giacomo': 'Echo',
  'binary_sensor.door_sensor_8_porta': 'Porta',
  'binary_sensor.tapparella_giacomo_tapparella_giacomo': 'Contatto tapparella',
  // Camera Padronale
  'light.camera_padr_luce_balcone': 'Luce balcone',
  'light.camera_padronale_faretti': 'Faretti',
  'light.comodinouno': 'Comodino 1',
  'light.comodinodue': 'Comodino 2',
  'light.veletta_camera_padronale': 'Veletta',
  'cover.salita_balcone_camera_padr': 'Tapparella balcone',
  'cover.salita_finestra_camera_padr': 'Tapparella finestra',
  'switch.padronale_comodino_padronale_comodino': 'Presa comodino',
  'binary_sensor.balcone_padronale_porta': 'Porta balcone',
  'binary_sensor.finestra_padronale_porta': 'Finestra',
  'binary_sensor.letto_padronale': 'Letto',
  'binary_sensor.aria_condizionata_padronale_porta': 'Sportello condizionatore',
  'binary_sensor.tapparella_padronale_tapparella_padronale': 'Contatto tapparella',
  'scene.ac_padronale_26degc_silenzioso': 'Clima 26°',
  'scene.ac_padronale_deumidificatore': 'Deumidifica',
  'scene.ac_padronale_spegnimento': 'Clima spento',
  // Bagni
  'light.bagno_padr_luce_centro': 'Luce centrale',
  'light.bagno_padronale_luce_doccia': 'Luce doccia',
  'light.bagno_padronale_specchio': 'Specchio',
  'switch.aspiratore_bagno_padr_aspiratore_bagno_padr': 'Aspiratore',
  'media_player.elisabetta': 'Echo',
  'light.bagno_ragazzi_faretti': 'Faretti',
  'light.bagno_ragazzi_faretto_doccia': 'Faretto doccia',
  'light.specchio_ragazzi_switch_2': 'Luce specchio',
  'switch.zigbee_2_gang_module_switch_1': 'Antiappannamento',
  'binary_sensor.door_sensor_4_porta': 'Porta',
  'binary_sensor.finestra_bagno_ragazzi_porta': 'Finestra',
  'binary_sensor.grata_bagno_grata_bagno': 'Grata',
  'media_player.ragazzi': 'Echo',
  'light.bagno_di_servizio_faretti': 'Faretti',
  'light.doccia_servizio_luce': 'Luce doccia',
  'switch.riscaldamento_bagnetto_riscaldamento_bagnetto': 'Riscaldamento',
  'binary_sensor.grata_bagnetto_grata_bagnetto': 'Grata',
  // Balconi e servizio
  'light.luci_balcone': 'Luci balcone',
  'light.luci_balcone_2': 'Luci balcone 2',
  'switch.irrigazione_interruttore': 'Irrigazione',
  'switch.riscaldamento_ir_terrazzo_riscaldamento_ir_terrazzo': 'Riscaldatore terrazzo',
  'binary_sensor.presenza_balcone_presenza_balcone': 'Movimento',
  'light.camera_servizio_faretti': 'Faretti',
  'switch.cc_lavatrice_cc_lavatrice': 'Lavatrice',
  'binary_sensor.lavatrice_umidita': 'Perdita d’acqua',
  // Corridoio e ingresso
  'light.corridoio_faretti': 'Faretti',
  'light.led_corridoio': 'Led',
  'binary_sensor.ir_zona_notte_ir_zona_notte': 'Sensore zona notte',
  'light.ingresso_applique': 'Applique',
  'light.ingresso_faretti': 'Faretti',
  'binary_sensor.door_sensor_7_porta': 'Porta corridoio ragazzi',
  // Cucina
  'light.cucina_faretti': 'Faretti',
  'light.cucina_led_sotto_piano': 'Led sotto piano',
  'light.cucina_luce_penisola': 'Penisola',
  'light.led_piano_cucina': 'Led piano',
  'light.veletta_cucina': 'Veletta',
  'cover.balcone_cucina': 'Tapparella balcone',
  'switch.cc_forno_cc_forno': 'Forno',
  'switch.cc_lavastoviglie_cc_lavastoviglie': 'Lavastoviglie',
  'media_player.cucina_roma': 'Echo',
  'media_player.tv_lg28_cucina': 'TV',
  'binary_sensor.cucina_umidita': 'Perdita d’acqua',
  'binary_sensor.door_sensor_6_porta': 'Porta balcone',
  'binary_sensor.tapparella_cucina_tapparella_cucina': 'Contatto tapparella',
  // Soggiorno
  'light.faretti_sogg': 'Faretti',
  'light.led_mensole': 'Led mensole',
  'light.led_sotto_mobile': 'Led sotto mobile',
  'light.led_veletta_soggiorno': 'Veletta',
  'light.luce_divano': 'Divano',
  'light.luce_nicchia_sogg': 'Nicchia',
  'light.luce_pranzo': 'Lampadario pranzo',
  'light.lume': 'Lume',
  'light.palla': 'Palla',
  'light.quadro_faretti_led': 'Quadro',
  'light.scrivania': 'Scrivania',
  'cover.finestra_pranzo': 'Tapparella pranzo',
  'cover.salita_balcone_sogg': 'Tapparella balcone',
  'cover.salita_finestra_sogg': 'Tapparella finestra',
  'media_player.soggiorno_android_tv_soggiorno': 'Fire TV',
  'media_player.lg_65_soggiorno': 'TV LG 65″',
  'media_player.soggiorno': 'Echo',
  'switch.presa_c_ta_angolo_bar_presa_c_ta_angolo_bar': 'Presa angolo bar',
  'switch.presa_c_ta_angolo_presa_c_ta_angolo': 'Presa angolo',
  'switch.presa_c_ta_natale_presa_c_ta_natale': 'Presa Natale',
  'binary_sensor.door_sensor_5_porta': 'Porta balcone',
  'binary_sensor.tapparella_balcone_tapparella_balcone': 'Contatto tapparella balcone',
  'binary_sensor.tapparella_pranzo_tapparella_pranzo': 'Contatto tapparella pranzo',
  'binary_sensor.tapparella_soggiorno_tapparella_soggiorno': 'Contatto tapparella finestra',
  'binary_sensor.tapparella_soggiorno_tapparella_soggiorno_2': 'Contatto tapparella finestra 2',
  // Termostati
  'climate.termosifone_alfredo': 'Termosifone',
  'climate.termosifone_padronale': 'Termosifone',
  'climate.termosifone_soggiorno': 'Termosifone',
  'climate.termosifone_bagno_ragazzi': 'Termosifone',
  'climate.termosifone_ingresso': 'Termosifone',
  // Impianto (area tecnica)
  'switch.cc_aria_condizionata_cc_aria_condizionata': 'Linea aria condizionata',
  'sensor.inserimento_inserimento': 'Allarme',
};
