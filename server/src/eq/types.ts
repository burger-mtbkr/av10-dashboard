export type SpeakerPreset = 1 | 2;

export interface IEqBand {
  frequencyHz: number;
  gainDb: number;
}

export interface IEqProfile {
  id: string;
  name: string;
  readonly: boolean;
  updatedAt: string;
  bands: IEqBand[];
}

export interface IEqPresetProfiles {
  defaultProfiles: IEqProfile[];
  customProfiles: IEqProfile[];
}

export interface IEqProfilesStoreData {
  version: number;
  bandFrequenciesHz: number[];
  presets: Record<SpeakerPreset, IEqPresetProfiles>;
}
