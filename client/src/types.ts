// Shared types — mirrors server types for the frontend
export interface SpeakerStatus {
  code: string;
  name: string;
  active: boolean;
  group: 'ear' | 'height' | 'sub' | 'wide' | 'back';
}

export interface VideoInfo {
  inputResolution: string;
  outputResolution: string;
  hdrFormat: string;
  inputSignal: string;
  hdmiOutput: string;
}

export interface AudioInfo {
  inputFormat: string;
  soundMode: string;
  samplingRate: string;
  dialogEnhancer: string;
  dynamicEq: string;
  dynamicVolume: string;
  multEq: string;
}

export interface SubwooferInfo {
  number: number;
  level: string;
  active: boolean;
}

export interface InputSource {
  id: string;
  name: string;
  selected: boolean;
}

export interface SmartSelectPreset {
  number: number;
  name: string;
  active: boolean;
}

export interface AVRStatus {
  power: 'ON' | 'OFF' | 'STANDBY';
  volume: number;
  volumeDisplay: string;
  maxVolume: number;
  muted: boolean;
  input: InputSource;
  availableInputs: InputSource[];
  smartSelect: SmartSelectPreset[];
  speakers: SpeakerStatus[];
  video: VideoInfo;
  audio: AudioInfo;
  subwoofers: SubwooferInfo[];
  lfeLevel: string;
  ecoMode: string;
  surroundMode: string;
  connected: boolean;
  lastUpdate: string;
}

export interface WSMessage {
  type: 'status' | 'event' | 'error' | 'connected' | 'disconnected';
  data: AVRStatus | any;
}
