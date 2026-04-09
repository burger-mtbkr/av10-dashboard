// Shared types between server and client
export interface ISpeakerStatus {
  /** Speaker channel code e.g. "FL", "FR", "C", "SW" */
  code: string;
  /** Human-readable name e.g. "Front Left" */
  name: string;
  /** Whether this speaker is active in the current configuration */
  active: boolean;
  /** Speaker group: ear, height, sub, wide, back */
  group: 'ear' | 'height' | 'sub' | 'wide' | 'back';
}

export interface IVideoInfo {
  /** Input signal resolution e.g. "1080p" "4K" */
  inputResolution: string;
  /** Output signal resolution */
  outputResolution: string;
  /** HDR format if any e.g. "HDR10", "Dolby Vision", "HLG", "None" */
  hdrFormat: string;
  /** Input signal format e.g. "HDMI", "No Signal" */
  inputSignal: string;
  /** HDMI output target */
  hdmiOutput: string;
}

export interface IAudioInfo {
  /** Input audio format e.g. "Dolby TrueHD", "DTS-HD MA" */
  inputFormat: string;
  /** Current sound mode e.g. "Dolby Atmos", "DTS:X" */
  soundMode: string;
  /** Sampling frequency e.g. "48kHz" */
  samplingRate: string;
  /** Dialog enhancement level */
  dialogEnhancer: string;
  /** Dynamic EQ on/off */
  dynamicEq: string;
  /** Dynamic Volume setting */
  dynamicVolume: string;
  /** MultEQ mode */
  multEq: string;
}

export interface ISubwooferInfo {
  /** Subwoofer number (1-4) */
  number: number;
  /** Level in dB e.g. "0.0", "+3.5", "-6.0" */
  level: string;
  /** Whether the subwoofer is active */
  active: boolean;
}

export interface IInputSource {
  /** Source ID e.g. "SAT/CBL", "BD", "GAME" */
  id: string;
  /** Display name — custom label from receiver or config override */
  name: string;
  /** Whether this is the currently selected input */
  selected: boolean;
}

export interface ISmartSelectPreset {
  /** Preset number (1-4) */
  number: number;
  /** Friendly name assigned on the receiver, or fallback like "Smart Select 1" */
  name: string;
  /** Whether this is the currently active preset */
  active: boolean;
}

export interface IAVRStatus {
  /** Power state */
  power: 'ON' | 'OFF' | 'STANDBY';
  /** Receiver model reported by the unit, e.g. "Marantz AV10" */
  processorModel: string;
  /** Installed firmware / software version */
  softwareVersion: string;
  /** Main volume on absolute scale (0-98) */
  volume: number;
  /** Volume display string e.g. "50" */
  volumeDisplay: string;
  /** Max volume limit on absolute scale (0-98) */
  maxVolume: number;
  /** Mute state */
  muted: boolean;
  /** Currently selected input source */
  input: IInputSource;
  /** All available input sources with custom names */
  availableInputs: IInputSource[];
  /** Smart Select presets 1-4 with friendly names from the receiver */
  smartSelect: ISmartSelectPreset[];
  /** Active speakers */
  speakers: ISpeakerStatus[];
  /** Video signal information */
  video: IVideoInfo;
  /** Audio signal information */
  audio: IAudioInfo;
  /** Subwoofer info for each active sub */
  subwoofers: ISubwooferInfo[];
  /** LFE (Low Frequency Effect) level e.g. "0 dB", "-5 dB" */
  lfeLevel: string;
  /** ECO mode */
  ecoMode: string;
  /** Network connection type reported by the receiver */
  networkConnection: string;
  /** Receiver IP address */
  ipAddress: string;
  /** Sound mode / surround mode name */
  surroundMode: string;
  /** Connection status to receiver */
  connected: boolean;
  /** Last update timestamp */
  lastUpdate: string;
}

export interface IWSMessage {
  type: 'status' | 'event' | 'error' | 'connected' | 'disconnected';
  data: IAVRStatus | ITelnetEvent | string;
}

export interface ITelnetEvent {
  zone: string;
  event: string;
  parameter: string;
}

export type SpeakerStatus = ISpeakerStatus;
export type VideoInfo = IVideoInfo;
export type AudioInfo = IAudioInfo;
export type SubwooferInfo = ISubwooferInfo;
export type InputSource = IInputSource;
export type SmartSelectPreset = ISmartSelectPreset;
export type AVRStatus = IAVRStatus;
export type WSMessage = IWSMessage;
export type TelnetEvent = ITelnetEvent;
