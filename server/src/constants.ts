/** Channel code to human-readable name mapping */
export const PLACEHOLDER_VALUE = '---';

export const CHANNEL_MAP: Record<string, { name: string; group: 'ear' | 'height' | 'sub' | 'wide' | 'back' }> = {
  FL:  { name: 'Front Left',           group: 'ear' },
  FR:  { name: 'Front Right',          group: 'ear' },
  C:   { name: 'Center',               group: 'ear' },
  SW:  { name: 'Subwoofer',            group: 'sub' },
  SW2: { name: 'Subwoofer 2',          group: 'sub' },
  SW3: { name: 'Subwoofer 3',          group: 'sub' },
  SW4: { name: 'Subwoofer 4',          group: 'sub' },
  SL:  { name: 'Surround Left',        group: 'ear' },
  SR:  { name: 'Surround Right',       group: 'ear' },
  SBL: { name: 'Surround Back Left',   group: 'back' },
  SBR: { name: 'Surround Back Right',  group: 'back' },
  SB:  { name: 'Surround Back',        group: 'back' },
  FHL: { name: 'Front Height Left',    group: 'height' },
  FHR: { name: 'Front Height Right',   group: 'height' },
  FWL: { name: 'Front Wide Left',      group: 'wide' },
  FWR: { name: 'Front Wide Right',     group: 'wide' },
  TFL: { name: 'Top Front Left',       group: 'height' },
  TFR: { name: 'Top Front Right',      group: 'height' },
  TML: { name: 'Top Middle Left',      group: 'height' },
  TMR: { name: 'Top Middle Right',     group: 'height' },
  TRL: { name: 'Top Rear Left',        group: 'height' },
  TRR: { name: 'Top Rear Right',       group: 'height' },
  RHL: { name: 'Rear Height Left',     group: 'height' },
  RHR: { name: 'Rear Height Right',    group: 'height' },
  FDL: { name: 'Front Dolby Left',     group: 'height' },
  FDR: { name: 'Front Dolby Right',    group: 'height' },
  SDL: { name: 'Surround Dolby Left',  group: 'height' },
  SDR: { name: 'Surround Dolby Right', group: 'height' },
  BDL: { name: 'Back Dolby Left',      group: 'height' },
  BDR: { name: 'Back Dolby Right',     group: 'height' },
  SHL: { name: 'Surround Height Left', group: 'height' },
  SHR: { name: 'Surround Height Right',group: 'height' },
  TS:  { name: 'Top Surround',         group: 'height' },
  CH:  { name: 'Center Height',        group: 'height' },
};

/**
 * OPINFASP telnet channel order — maps character positions to speaker codes.
 * The Marantz AV10/Cinema series sends a digit string via telnet `OPINFASP`
 * where each position represents a speaker: 0=not configured, 1=configured, 2=active.
 */
export const OPINFASP_CHANNEL_ORDER: string[] = [
  'FL', 'FR', 'C', 'SW', 'SL', 'SR', 'SBL', 'SBR',
  'SB', 'SDL', 'SDR', 'FWL', 'FWR', 'TFL', 'TFR',
  'TML', 'TMR', 'TRL', 'TRR', 'SHL', 'SHR', 'FDL',
  'FDR', 'FHL', 'FHR', 'BDL', 'BDR', 'RHL', 'RHR',
  'TS', 'CH', 'SW2',
];

/** Source ID to default name mapping */
export const SOURCE_MAP: Record<string, string> = {
  'SAT/CBL': 'CBL/SAT',
  'BD':      'Blu-ray',
  'DVD':     'DVD',
  'GAME':    'Game',
  'AUX1':    'AUX',
  'AUX2':    'AUX2',
  'TV':      'TV Audio',
  'MPLAY':   'Media Player',
  'CD':      'CD',
  'PHONO':   'Phono',
  'TUNER':   'Tuner',
  'NET':     'NETWORK',
  'BT':      'Bluetooth',
  'USB/IPOD':'iPod/USB',
};

/** Smart Select preset numbers (Marantz AV10 supports 1-4) */
export const SMART_SELECT_SLOTS = [1, 2, 3, 4] as const;

/** Default Smart Select names when the receiver provides no custom label */
export const SMART_SELECT_DEFAULTS: Record<number, string> = {
  1: 'Smart Select 1',
  2: 'Smart Select 2',
  3: 'Smart Select 3',
  4: 'Smart Select 4',
};

/** Telnet event prefixes to status field mapping */
export const TELNET_EVENT_MAP: Record<string, string> = {
  MSSMART: 'smartSelect',
  MSQUICK: 'smartSelect',
  SPPR: 'speakerPreset',
  MV: 'volume',
  SI: 'input',
  MS: 'surroundMode',
  MU: 'muted',
  PW: 'power',
  ZM: 'power',
  CV: 'channelVolume',
  PS: 'parameterSetting',
  VS: 'videoSelect',
  SS: 'systemSettings',
  SD: 'inputMode',
  SV: 'videoInput',
  DC: 'digitalInput',
  EC: 'ecoMode',
  OP: 'operation',
};

/** Volume value mapping: Marantz sends 2-3 digit absolute values (0-98 scale).
 *  2-digit: integer steps, e.g. "50" → 50, "75" → 75
 *  3-digit: half-step precision, e.g. "505" → 50.5, "755" → 75.5
 */
export const parseVolume = (raw: string): number => {
  const num = parseInt(raw, 10);
  if (raw.length === 3) {
    // e.g. "505" → 50.5
    return num / 10;
  }
  // e.g. "50" → 50
  return num;
};

/** Convert an absolute volume (0-98) back to a Marantz command string */
export const volumeToCommand = (vol: number): string => {
  if (vol % 1 !== 0) {
    // Half step: e.g. 50.5 → "505"
    return String(Math.round(vol * 10)).padStart(3, '0');
  }
  // Integer step: e.g. 50 → "50", 5 → "05"
  return String(Math.round(vol)).padStart(2, '0');
};
