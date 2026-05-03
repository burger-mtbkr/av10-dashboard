/** Denon/Marantz telnet graphic EQ (PSGEQ): 5-digit Hz + signed dB with one decimal. */

/** AVR graphic EQ range (dB) — must match eq/validators and client EQ UI. */
const EQ_MIN_DB = -20;
const EQ_MAX_DB = 6;

export const formatGraphicEqFrequencyHz = (hz: number): string =>
  String(Math.round(hz)).padStart(5, '0');

/** Encode gain for PSGEQ write commands, e.g. +00.0 / -03.5 */
export const formatGraphicEqGainDb = (db: number): string => {
  const clamped = Math.min(EQ_MAX_DB, Math.max(EQ_MIN_DB, Math.round(db * 10) / 10));
  const sign = clamped >= 0 ? '+' : '-';
  const v = Math.abs(clamped);
  const whole = Math.floor(v + 1e-9);
  const frac = Math.round((v - whole) * 10);
  /** Whole part up to two digits (-20.0 … +06.0). */
  return `${sign}${String(whole).padStart(2, '0')}.${frac}`;
};

/** Compact write form for band values, e.g. `PSGEQ00063+04.0`. */
export const formatGraphicEqBandCommand = (hz: number, db: number): string =>
  `PSGEQ${formatGraphicEqFrequencyHz(hz)}${formatGraphicEqGainDb(db)}`;

/** Parse telnet lines such as `PSGEQ 00063 +00.0` or compact `PSGEQ00063+00.0`. */
export const parseGraphicEqTelnetLine = (line: string): { frequencyHz: number; gainDb: number } | null => {
  const trimmed = line.trim();
  if (!trimmed.startsWith('PSGEQ')) return null;

  const afterPrefix = trimmed.slice(5).trimStart();
  const freqMatch = /^(\d{5})/.exec(afterPrefix);
  if (!freqMatch) return null;

  const frequencyHz = parseInt(freqMatch[1], 10);
  const rest = afterPrefix.slice(5).trimStart();
  const gainMatch = /^([+-]\d+(?:\.\d+)?)/.exec(rest);
  if (!gainMatch) return null;

  const gainDb = parseFloat(gainMatch[1]);
  if (!Number.isFinite(gainDb)) return null;

  return { frequencyHz, gainDb };
};
