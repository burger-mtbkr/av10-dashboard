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
}

export interface IWSMessage {
  type: 'status' | 'event' | 'error' | 'connected' | 'disconnected';
  data: IAVRStatus | unknown;
}

export type SpeakerStatus = ISpeakerStatus;
export type VideoInfo = IVideoInfo;
export type AudioInfo = IAudioInfo;
export type SubwooferInfo = ISubwooferInfo;
export type InputSource = IInputSource;
export type SmartSelectPreset = ISmartSelectPreset;
export type AVRStatus = IAVRStatus;
export type WSMessage = IWSMessage;
