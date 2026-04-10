import type {
  IAudioInfo,
  IAVRStatus,
  IInputSource,
  ISmartSelectPreset,
  ISpeakerStatus,
} from '../types.js';

export interface IAppCommand0300Request {
  name: string;
  params: string[];
}

export interface IHeosQuickSelectName {
  id: number;
  name: string;
}

export interface IVideoSignalInfo {
  inputResolution: string;
  outputResolution: string;
  hdrFormat: string;
  inputSignal: string;
}

export interface IAudioSignalInfo {
  inputFormat: IAudioInfo['inputFormat'];
  soundMode: IAudioInfo['soundMode'];
  samplingRate: IAudioInfo['samplingRate'];
}

export interface INetworkInfo {
  networkConnection: string;
  ipAddress: string;
}

export interface IHttpStatusResult {
  power?: IAVRStatus['power'];
  processorModel?: string;
  volume?: number;
  muted?: boolean;
  input?: IInputSource;
  availableInputs?: IInputSource[];
  smartSelect?: ISmartSelectPreset[];
  speakerPreset?: IAVRStatus['speakerPreset'];
  speakers?: ISpeakerStatus[];
  video?: IAVRStatus['video'];
  audio?: IAudioSignalInfo;
  softwareVersion?: string;
  networkConnection?: string;
  ipAddress?: string;
  surroundMode?: string;
}