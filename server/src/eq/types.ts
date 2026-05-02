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
  /** When false, graphic EQ adjustments are off for this speaker preset (UI shows stored curve only). */
  graphicEqAdjustmentsEnabled?: boolean;
}

export interface IEqProfilesStoreData {
  version: number;
  bandFrequenciesHz: number[];
  presets: Record<SpeakerPreset, IEqPresetProfiles>;
}
