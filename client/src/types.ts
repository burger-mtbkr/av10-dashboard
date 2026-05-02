// Shared types — mirrors server types for the frontend
export interface ISpeakerStatus {
  code: string;
  name: string;
  active: boolean;
  group: 'ear' | 'height' | 'sub' | 'wide' | 'back';
}

export interface IVideoInfo {
  inputResolution: string;
  outputResolution: string;
  hdrFormat: string;
  inputSignal: string;
  hdmiOutput: string;
}

export interface IAudioInfo {
  inputFormat: string;
  soundMode: string;
  samplingRate: string;
  dialogEnhancer: string;
  dynamicEq: string;
  dynamicVolume: string;
  multEq: string;
}

export interface ISubwooferInfo {
  number: number;
  level: string;
  active: boolean;
}

export interface IInputSource {
  id: string;
  name: string;
  selected: boolean;
}

export interface ISmartSelectPreset {
  number: number;
  name: string;
  active: boolean;
}

/** Graphic EQ bands reported by the processor */
export interface IGraphicEqStatus {
  bands: IEqBand[];
  updatedAt: string;
  /** False when the AVR reports graphic EQ adjustments bypassed / off (telnet). */
  adjustmentsEnabled?: boolean;
}

export interface IAVRStatus {
  power: 'ON' | 'OFF' | 'STANDBY';
  processorModel: string;
  softwareVersion: string;
  volume: number;
  volumeDisplay: string;
  maxVolume: number;
  muted: boolean;
  input: IInputSource;
  availableInputs: IInputSource[];
  smartSelect: ISmartSelectPreset[];
  speakerPreset: 1 | 2 | null;
  speakerLayout: string;
  speakers: ISpeakerStatus[];
  video: IVideoInfo;
  audio: IAudioInfo;
  subwoofers: ISubwooferInfo[];
  lfeLevel: string;
  ecoMode: string;
  networkConnection: string;
  ipAddress: string;
  surroundMode: string;
  connected: boolean;
  lastUpdate: string;
  graphicEq?: IGraphicEqStatus | null;
}

export interface IWSMessage {
  type: 'status' | 'event' | 'error' | 'connected' | 'disconnected';
  data: IAVRStatus | unknown;
}

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

export interface IEqProfilesResponse {
  bandFrequenciesHz: number[];
  profiles: IEqProfile[];
  /** False when graphic EQ adjustments are disabled for this speaker preset (see eq-profiles.json). */
  graphicEqAdjustmentsEnabled?: boolean;
}

export type SpeakerStatus = ISpeakerStatus;
export type VideoInfo = IVideoInfo;
export type AudioInfo = IAudioInfo;
export type SubwooferInfo = ISubwooferInfo;
export type InputSource = IInputSource;
export type SmartSelectPreset = ISmartSelectPreset;
export type AVRStatus = IAVRStatus;
export type WSMessage = IWSMessage;
