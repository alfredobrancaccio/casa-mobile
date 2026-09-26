// Registro icone dell'app: un solo lessico semantico, basato su Material Design Icons
// (lo stesso usato da Home Assistant). Solo le icone elencate entrano nel bundle.
import {
  mdiAirConditioner, mdiAlarm, mdiCartOutline, mdiCogOutline, mdiLeaf, mdiPulse, mdiSpeedometer, mdiThemeLightDark, mdiWifi, mdiAlertCircleOutline, mdiAlertOutline, mdiArrowLeft, mdiBalcony,
  mdiBattery, mdiBattery20, mdiBattery50, mdiBatteryCharging, mdiBedKingOutline, mdiBedOutline, mdiBike,
  mdiCar, mdiCeilingLight, mdiCellphone, mdiChairRolling, mdiCheckCircleOutline, mdiChevronDown,
  mdiChevronRight, mdiChevronUp, mdiClose, mdiCloudOffOutline, mdiCountertopOutline, mdiDevices,
  mdiDishwasher, mdiDoorClosed, mdiDoorOpen, mdiDotsHorizontal, mdiFan, mdiFence, mdiFloorLamp,
  mdiFloorPlan, mdiGarage, mdiGarageOpen, mdiHeatWave, mdiHomeAccount, mdiHomeBatteryOutline,
  mdiHomeLightningBoltOutline, mdiHomeOutline, mdiHuman, mdiInformationOutline, mdiLedStripVariant,
  mdiLightbulbGroupOutline, mdiLightbulbOn, mdiLightbulbOutline, mdiLightningBolt, mdiLockOutline,
  mdiLogout, mdiMapMarkerOutline, mdiMinus, mdiMotionSensor, mdiPalette, mdiPause, mdiPlay, mdiPlus,
  mdiPower, mdiPowerSocketEu, mdiRadiator, mdiRadiatorOff, mdiRun, mdiShieldAlertOutline,
  mdiShieldCheckOutline, mdiShieldHomeOutline, mdiShieldOutline, mdiShower, mdiSleep, mdiSofaOutline,
  mdiSolarPower, mdiSpotlightBeam, mdiSpeaker, mdiSprinklerVariant, mdiStop, mdiStove, mdiTablet,
  mdiTelevision, mdiTelevisionPlay, mdiThermometer, mdiToilet, mdiTransmissionTower, mdiTune, mdiVibrate,
  mdiVolumeMinus, mdiVolumePlus, mdiWalk, mdiWashingMachine, mdiWaterAlert, mdiWaterPercent,
  mdiWeatherCloudy, mdiWeatherFog, mdiWeatherHail, mdiWeatherLightning, mdiWeatherLightningRainy,
  mdiWeatherNight, mdiWeatherNightPartlyCloudy, mdiWeatherPartlyCloudy, mdiWeatherPouring,
  mdiWeatherRainy, mdiWeatherSnowy, mdiWeatherSnowyRainy, mdiWeatherSunny, mdiWeatherWindy,
  mdiWindowClosedVariant, mdiWindowOpenVariant, mdiWindowShutter, mdiWindowShutterOpen, mdiWrenchOutline,
} from '@mdi/js';

export const ICONS = {
  // navigazione
  home: mdiHomeOutline, rooms: mdiFloorPlan, devices: mdiDevices, energy: mdiLightningBolt,
  more: mdiDotsHorizontal, back: mdiArrowLeft, chevron: mdiChevronRight, close: mdiClose,
  // stanze
  bed: mdiBedOutline, bedKing: mdiBedKingOutline, shower: mdiShower, toilet: mdiToilet, sofa: mdiSofaOutline,
  kitchen: mdiCountertopOutline, entrance: mdiDoorOpen, corridor: mdiDoorClosed, balcony: mdiBalcony,
  laundry: mdiWashingMachine,
  // luci
  light: mdiLightbulbOutline, lightOn: mdiLightbulbOn, lightGroup: mdiLightbulbGroupOutline,
  ledStrip: mdiLedStripVariant, spot: mdiSpotlightBeam, lamp: mdiFloorLamp, ceiling: mdiCeilingLight,
  // tapparelle
  shutter: mdiWindowShutter, shutterOpen: mdiWindowShutterOpen, up: mdiChevronUp, down: mdiChevronDown,
  stop: mdiStop,
  // clima
  radiator: mdiRadiator, radiatorOff: mdiRadiatorOff, thermometer: mdiThermometer, humidity: mdiWaterPercent,
  airConditioner: mdiAirConditioner, heater: mdiHeatWave, fan: mdiFan,
  // prese e utenze
  outlet: mdiPowerSocketEu, stove: mdiStove, dishwasher: mdiDishwasher, washing: mdiWashingMachine,
  irrigation: mdiSprinklerVariant,
  // media
  tv: mdiTelevision, streamer: mdiTelevisionPlay, speaker: mdiSpeaker, play: mdiPlay, pause: mdiPause,
  volumeDown: mdiVolumeMinus, volumeUp: mdiVolumePlus, power: mdiPower,
  // scene
  scene: mdiPalette,
  // sensori e sicurezza
  doorClosed: mdiDoorClosed, doorOpen: mdiDoorOpen, windowClosed: mdiWindowClosedVariant,
  windowOpen: mdiWindowOpenVariant, garage: mdiGarage, garageOpen: mdiGarageOpen, motion: mdiMotionSensor,
  chair: mdiChairRolling, leak: mdiWaterAlert, vibration: mdiVibrate, shield: mdiShieldOutline,
  shieldHome: mdiShieldHomeOutline, shieldOk: mdiShieldCheckOutline, shieldAlert: mdiShieldAlertOutline,
  grate: mdiFence,
  // stato
  alert: mdiAlertCircleOutline, warning: mdiAlertOutline, ok: mdiCheckCircleOutline, offline: mdiCloudOffOutline,
  wrench: mdiWrenchOutline, info: mdiInformationOutline, lock: mdiLockOutline, tune: mdiTune,
  plus: mdiPlus, minus: mdiMinus, logout: mdiLogout, settings: mdiCogOutline, theme: mdiThemeLightDark,
  cart: mdiCartOutline, network: mdiWifi, speed: mdiSpeedometer, leaf: mdiLeaf, pulse: mdiPulse,
  // persone e dispositivi personali
  phone: mdiCellphone, tablet: mdiTablet, atHome: mdiHomeAccount, away: mdiMapMarkerOutline, alarm: mdiAlarm,
  battery: mdiBattery, batteryMid: mdiBattery50, batteryLow: mdiBattery20, charging: mdiBatteryCharging,
  still: mdiHuman, walk: mdiWalk, run: mdiRun, bike: mdiBike, car: mdiCar, sleep: mdiSleep,
  // energia
  solar: mdiSolarPower, grid: mdiTransmissionTower, homeBattery: mdiHomeBatteryOutline,
  homePower: mdiHomeLightningBoltOutline,
  // meteo
  sunny: mdiWeatherSunny, night: mdiWeatherNight, partlyCloudy: mdiWeatherPartlyCloudy,
  nightPartlyCloudy: mdiWeatherNightPartlyCloudy, cloudy: mdiWeatherCloudy, fog: mdiWeatherFog,
  rainy: mdiWeatherRainy, pouring: mdiWeatherPouring, snowy: mdiWeatherSnowy, lightning: mdiWeatherLightning,
  lightningRainy: mdiWeatherLightningRainy, windy: mdiWeatherWindy, hail: mdiWeatherHail,
  snowyRainy: mdiWeatherSnowyRainy,
} as const;

export type IconName = keyof typeof ICONS;

/**
 * Dimensioni delle icone per RUOLO (px). Icone con lo stesso ruolo hanno sempre la stessa misura.
 * - inline: dentro testo piccolo, indicatori, chip, note
 * - row: righe di elenco, voci di menu, pulsanti con testo, chevron
 * - control: controlli e card (navigazione, riquadri, scorciatoie, stanze, categorie, pulsanti icona)
 * - feature: icona principale di un pannello o di una scheda di stato
 * - hero: meteo e schermate di avvio
 */
export const ICON_SIZE = { inline: 16, row: 20, control: 24, feature: 28, hero: 32 } as const;
export type IconSize = keyof typeof ICON_SIZE;
