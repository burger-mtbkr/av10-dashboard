// Shared types between server and client
export interface SpeakerStatus {
  /** Speaker channel code e.g. "FL", "FR", "C", "SW" */
  code: string;
  /** Human-readable name e.g. "Front Left" */
  name: string;
  /** Whether this speaker is active in the current configuration */
  active: boolean;
  /** Speaker group: ear, height, sub, wide, back */
  group: 'ear' | 'height' | 'sub' | 'wide' | 'back';
}

export interface VideoInfo {
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

export interface AudioInfo {
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

export interface SubwooferInfo {
  /** Subwoofer number (1-4) */
  number: number;
  /** Level in dB e.g. "0.0", "+3.5", "-6.0" */
  level: string;
  /** Whether the subwoofer is active */
  active: boolean;
}

export interface InputSource {
  /** Source ID e.g. "SAT/CBL", "BD", "GAME" */
  id: string;
  /** Display name — custom label from receiver or config override */
  name: string;
  /** Whether this is the currently selected input */
  selected: boolean;
}

export interface AVRStatus {
  /** Power state */
  power: 'ON' | 'OFF' | 'STANDBY';
  /** Main volume on absolute scale (0-98) */
  volume: number;
  /** Volume display string e.g. "50" */
  volumeDisplay: string;
  /** Max volume limit on absolute scale (0-98) */
  maxVolume: number;
  /** Mute state */
  muted: boolean;
  /** Currently selected input source */
  input: InputSource;
  /** All available input sources with custom names */
  availableInputs: InputSource[];
  /** Active speakers */
  speakers: SpeakerStatus[];
  /** Video signal information */
  video: VideoInfo;
  /** Audio signal information */
  audio: AudioInfo;
  /** Subwoofer info for each active sub */
  subwoofers: SubwooferInfo[];
  /** LFE (Low Frequency Effect) level e.g. "0 dB", "-5 dB" */
  lfeLevel: string;
  /** ECO mode */
  ecoMode: string;
  /** Sound mode / surround mode name */
  surroundMode: string;
  /** Connection status to receiver */
  connected: boolean;
  /** Last update timestamp */
  lastUpdate: string;
}

export interface WSMessage {
  type: 'status' | 'event' | 'error' | 'connected' | 'disconnected';
  data: AVRStatus | TelnetEvent | string;
}

export interface TelnetEvent {
  zone: string;
  event: string;
  parameter: string;
}
