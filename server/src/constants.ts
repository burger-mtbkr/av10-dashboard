/** Channel code to human-readable name mapping */
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

/** Telnet event prefixes to status field mapping */
export const TELNET_EVENT_MAP: Record<string, string> = {
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
};

/** Volume value mapping: Marantz sends 2-3 digit values
 *  e.g. "50" = -30dB, "505" = -29.5dB, "80" = 0dB, "995" = 19.5dB
 *  Formula: (value / 10) - 80 if 3 digits, value - 80 if 2 digits
 */
export function parseVolume(raw: string): number {
  const num = parseInt(raw, 10);
  if (raw.length === 3) {
    // e.g. "505" → 50.5 → 50.5 - 80 = -29.5
    return (num / 10) - 80;
  }
  // e.g. "50" → 50 - 80 = -30
  return num - 80;
}

/** Convert dB volume back to Marantz command value */
export function volumeToCommand(db: number): string {
  const raw = db + 80;
  if (raw % 1 !== 0) {
    // Half step: e.g. -29.5 → 50.5 → "505"
    return String(Math.round(raw * 10)).padStart(3, '0');
  }
  // Integer step: e.g. -30 → 50 → "50", but single digits need padding: 5 → "05"
  return String(Math.round(raw)).padStart(2, '0');
}
