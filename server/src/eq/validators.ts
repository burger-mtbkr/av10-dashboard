import type { IEqBand, IEqProfile, IEqProfilesStoreData, SpeakerPreset } from './types.js';

const EQ_MIN_DB = -12;
const EQ_MAX_DB = 12;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const parsePreset = (value: string): SpeakerPreset | null => {
  if (value === '1') return 1;
  if (value === '2') return 2;
  return null;
};

export const validateBands = (bands: IEqBand[], expectedFrequencies: number[]): string | null => {
  if (!Array.isArray(bands) || bands.length !== expectedFrequencies.length) {
    return 'Bands must match the configured EQ band count';
  }

  for (let i = 0; i < expectedFrequencies.length; i += 1) {
    const band = bands[i];
    if (!band || !isFiniteNumber(band.frequencyHz) || !isFiniteNumber(band.gainDb)) {
      return 'Each band must include numeric frequencyHz and gainDb values';
    }
    if (band.frequencyHz !== expectedFrequencies[i]) {
      return 'Band frequencies must match the configured EQ model';
    }
    if (band.gainDb < EQ_MIN_DB || band.gainDb > EQ_MAX_DB) {
      return `Band gain must be within ${EQ_MIN_DB}..${EQ_MAX_DB} dB`;
    }
  }

  return null;
};

export const validateStoreData = (data: IEqProfilesStoreData): string | null => {
  if (!Array.isArray(data.bandFrequenciesHz) || data.bandFrequenciesHz.length === 0) {
    return 'bandFrequenciesHz must be a non-empty array';
  }
  if (!data.presets?.[1] || !data.presets?.[2]) {
    return 'Both preset 1 and 2 profile sections are required';
  }
  return null;
};

export const sanitizeProfileName = (name: string): string => name.trim().slice(0, 64);

export const ensureUniqueName = (name: string, profiles: IEqProfile[], ignoreProfileId?: string): boolean => {
  const normalized = name.trim().toLowerCase();
  return !profiles.some((profile) => {
    if (ignoreProfileId && profile.id === ignoreProfileId) return false;
    return profile.name.trim().toLowerCase() === normalized;
  });
};

export const clampGainDb = (gainDb: number): number =>
  Math.min(EQ_MAX_DB, Math.max(EQ_MIN_DB, Math.round(gainDb * 2) / 2));
