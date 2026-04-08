import * as net from 'net';
import { EventEmitter } from 'events';
import { CHANNEL_MAP, OPINFASP_CHANNEL_ORDER, SOURCE_MAP, SMART_SELECT_DEFAULTS, SMART_SELECT_SLOTS, TELNET_EVENT_MAP, parseVolume, volumeToCommand } from './constants.js';
import type { IAVRStatus, IInputSource, ISmartSelectPreset, ISpeakerStatus, ITelnetEvent } from './types.js';
import { fetchHttpStatus } from './api/fetch-http-status.js';

export class MarantzService extends EventEmitter {
  private host: string;
  private port: number;
  private httpPort: number;
  private socket: net.Socket | null = null;
  private connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectInterval: number;
  private buffer = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private pollInterval: number;

  private status: IAVRStatus = this.getDefaultStatus();

  constructor(host: string, port: number, httpPort: number, reconnectInterval = 10000, pollInterval = 30000) {
    super();
    this.host = host;
    this.port = port;
    this.httpPort = httpPort;
    this.reconnectInterval = reconnectInterval;
    this.pollInterval = pollInterval;
  }

  private getDefaultStatus(): IAVRStatus {
    return {
      power: 'OFF',
      softwareVersion: '---',
      volume: 0,
      volumeDisplay: '--',
      maxVolume: 98,
      muted: false,
      input: { id: '', name: '', selected: true },
      availableInputs: [],
      smartSelect: SMART_SELECT_SLOTS.map((n) => ({
        number: n,
        name: SMART_SELECT_DEFAULTS[n],
        active: false,
      })),
      speakers: [],
      video: {
        inputResolution: '---',
        outputResolution: '---',
        hdrFormat: '---',
        inputSignal: '---',
        hdmiOutput: 'Auto',
      },
      audio: {
        inputFormat: '---',
        soundMode: '---',
        samplingRate: '---',
        dialogEnhancer: 'Off',
        dynamicEq: '---',
        dynamicVolume: '---',
        multEq: '---',
      },
      subwoofers: [],
      lfeLevel: '0 dB',
      ecoMode: '---',
      networkConnection: '---',
      ipAddress: '---',
      surroundMode: '---',
      connected: false,
      lastUpdate: new Date().toISOString(),
    };
  }

  getStatus(): IAVRStatus {
    return JSON.parse(JSON.stringify(this.status));
  }

  async connect(): Promise<void> {
    console.log(`[Marantz] Connecting to ${this.host}:${this.port} (telnet)...`);
    this.createSocket();

    // Also do an initial HTTP poll for full status
    await this.pollHttpStatus();
    this.startHttpPolling();
  }

  private createSocket(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
    }

    this.socket = new net.Socket();
    this.socket.setEncoding('utf-8');

    this.socket.on('connect', () => {
      console.log('[Marantz] Telnet connected');
      this.connected = true;
      this.status.connected = true;
      this.emit('connected');

      // Request initial status via telnet
      this.sendCommand('PW?');
      this.sendCommand('MV?');
      this.sendCommand('MU?');
      this.sendCommand('SI?');
      this.sendCommand('MS?');
      this.sendCommand('VS?');
      this.sendCommand('PSLFE ?');
      this.sendCommand('PSSWL ?');
      this.sendCommand('PSSWR ?');
      this.sendCommand('ECO?');
      this.sendCommand('OPINF?');
      this.sendCommand('MSSMART ?');
    });

    this.socket.on('data', (data: string) => {
      this.buffer += data;
      this.processBuffer();
    });

    this.socket.on('error', (err) => {
      console.error('[Marantz] Socket error:', err.message);
    });

    this.socket.on('close', () => {
      console.log('[Marantz] Telnet disconnected');
      this.connected = false;
      this.status.connected = false;
      this.emit('disconnected');
      this.scheduleReconnect();
    });

    this.socket.connect(this.port, this.host);
  }

  private processBuffer(): void {
    // Marantz sends CR-terminated lines
    const lines = this.buffer.split('\r');
    // Keep the last incomplete fragment in the buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        this.handleTelnetEvent(trimmed);
      }
    }
  }

  private handleTelnetEvent(line: string): void {
    // Parse the telnet event
    // Events look like: "MVMAX 80", "MV50", "MUON", "SIDVD", "MSMOVIE", etc.
    let event = '';
    let parameter = '';

    // Try matching known prefixes (longest first)
    const prefixes = Object.keys(TELNET_EVENT_MAP).sort((a, b) => b.length - a.length);
    for (const prefix of prefixes) {
      if (line.startsWith(prefix)) {
        event = prefix;
        parameter = line.substring(prefix.length).trim();
        break;
      }
    }

    if (!event) {
      // Unknown event — just log it
      console.log(`[Marantz] Unknown event: ${line}`);
      return;
    }

    const telnetEvent: ITelnetEvent = { zone: 'Main', event, parameter };
    this.emit('event', telnetEvent);

    // Update internal status based on event
    this.updateStatusFromEvent(event, parameter);
  }

  private updateStatusFromEvent(event: string, parameter: string): void {
    let changed = false;

    switch (event) {
      case 'PW':
        if (parameter === 'ON' || parameter === 'STANDBY') {
          this.status.power = parameter === 'ON' ? 'ON' : 'STANDBY';
          changed = true;
        }
        break;

      case 'ZM':
        if (parameter === 'ON') {
          this.status.power = 'ON';
          changed = true;
        } else if (parameter === 'OFF') {
          this.status.power = 'OFF';
          changed = true;
        }
        break;

      case 'MV':
        if (parameter.startsWith('MAX')) {
          const maxVal = parameter.replace('MAX ', '').trim();
          this.status.maxVolume = parseVolume(maxVal);
        } else {
          this.status.volume = parseVolume(parameter);
          const v = this.status.volume;
          this.status.volumeDisplay = Number.isInteger(v) ? String(v) : v.toFixed(1);
        }
        changed = true;
        break;

      case 'MU':
        this.status.muted = parameter === 'ON';
        changed = true;
        break;

      case 'SI':
        this.status.input = {
          id: parameter,
          name: this.resolveInputName(parameter),
          selected: true,
        };
        // Update availableInputs selection
        this.status.availableInputs = this.status.availableInputs.map(i => ({
          ...i,
          selected: i.id === parameter,
        }));
        changed = true;
        break;

      case 'MSSMART':
      case 'MSQUICK':
        this.handleSmartSelect(parameter);
        changed = true;
        break;

      case 'MS':
        this.status.surroundMode = parameter;
        this.status.audio.soundMode = parameter;
        changed = true;
        break;

      case 'PS':
        this.handleParameterSetting(parameter);
        changed = true;
        break;

      case 'VS':
        this.handleVideoSetting(parameter);
        changed = true;
        break;

      case 'SS':
        // System settings — logged for debugging
        console.log('[Marantz] System setting (SS):', parameter);
        break;

      case 'OP':
        changed = this.handleOperationEvent(parameter);
        break;

      case 'EC':
        if (parameter === 'ON' || parameter === 'OFF' || parameter === 'AUTO') {
          this.status.ecoMode = parameter;
          changed = true;
        }
        break;

      default:
        // Log unhandled events for debugging
        console.log(`[Marantz] Unhandled: ${event}${parameter}`);
        break;
    }

    if (changed) {
      this.status.lastUpdate = new Date().toISOString();
      this.emit('statusChanged', this.status);
    }
  }

  private handleSmartSelect(param: string): void {
    // MSQUICK events: "MSQUICK1", "MSQUICK2", etc. or query responses like "1", "2"
    // After prefix stripping, param should be "1".."4" or contain a digit
    const match = param.match(/(\d)/);
    if (!match) return;
    const num = parseInt(match[1], 10);
    if (num < 1 || num > 4) return;

    this.status.smartSelect = this.status.smartSelect.map((p) => ({
      ...p,
      active: p.number === num,
    }));
  }

  private handleParameterSetting(param: string): void {
    if (param.startsWith('SWL')) {
      // Subwoofer level: "SWL 50" or "SWL2 47"
      const match = param.match(/^SWL(\d)?\s+(.+)$/);
      if (match) {
        const subNum = match[1] ? parseInt(match[1]) : 1;
        const rawLevel = match[2];
        const level = this.parseSubLevel(rawLevel);
        const existing = this.status.subwoofers.find(s => s.number === subNum);
        if (existing) {
          existing.level = level;
        } else {
          this.status.subwoofers.push({ number: subNum, level, active: true });
          this.status.subwoofers.sort((a, b) => a.number - b.number);
        }
      }
    } else if (param.startsWith('SWR')) {
      // Subwoofer on/off: "SWR ON" or "SWR OFF"
      // This doesn't map to individual subs directly
    } else if (param.startsWith('LFE')) {
      // LFE level: "LFE 00" (0dB), "LFE -5" (-5dB)
      const val = param.replace('LFE', '').trim();
      if (val === '00') {
        this.status.lfeLevel = '0 dB';
      } else {
        this.status.lfeLevel = `${val} dB`;
      }
    } else if (param.startsWith('DYNEQ')) {
      this.status.audio.dynamicEq = param.replace('DYNEQ ', '').trim();
    } else if (param.startsWith('DYNVOL')) {
      this.status.audio.dynamicVolume = param.replace('DYNVOL ', '').trim();
    } else if (param.startsWith('MULTEQ:')) {
      this.status.audio.multEq = param.replace('MULTEQ:', '').trim();
    }
  }

  private handleVideoSetting(param: string): void {
    // VS commands can be MONI (output), AUDIO, SC (scaling), etc.
    if (param.startsWith('MONI')) {
      const output = param.replace('MONI', '').trim();
      if (output === 'AUTO') this.status.video.hdmiOutput = 'Auto';
      else if (output === '1') this.status.video.hdmiOutput = 'HDMI 1';
      else if (output === '2') this.status.video.hdmiOutput = 'HDMI 2';
    }
  }

  private handleOperationEvent(param: string): boolean {
    if (param.startsWith('INFASP ')) {
      // Active Speaker Profile: digit string with per-channel status
      // 0=not configured, 1=configured/inactive, 2=active
      const digits = param.substring('INFASP '.length).trim();
      const speakers: ISpeakerStatus[] = [];
      for (let i = 0; i < digits.length && i < OPINFASP_CHANNEL_ORDER.length; i++) {
        const val = parseInt(digits[i], 10);
        if (isNaN(val) || val <= 0) continue; // 0 = not in layout
        const code = OPINFASP_CHANNEL_ORDER[i];
        const info = CHANNEL_MAP[code];
        if (!info) continue;
        speakers.push({
          code,
          name: info.name,
          active: val >= 2,
          group: info.group,
        });
      }
      if (speakers.length > 0) {
        console.log(`[Marantz] OPINFASP: ${speakers.length} speakers parsed`);
        this.status.speakers = speakers;
        return true;
      }
    }
    return false;
  }

  private parseSubLevel(raw: string): string {
    // Subwoofer levels: 50 = 0dB, 38 = -12dB, 62 = +12dB
    const num = parseInt(raw, 10);
    if (isNaN(num)) return raw;
    const db = num - 50;
    if (db === 0) return '0.0 dB';
    return `${db > 0 ? '+' : ''}${db}.0 dB`;
  }

  private resolveInputName(sourceId: string): string {
    // Check if we have a custom name from the receiver or config
    const existing = this.status.availableInputs.find(i => i.id === sourceId);
    if (existing && existing.name && existing.name !== sourceId) {
      return existing.name;
    }
    return SOURCE_MAP[sourceId] || sourceId;
  }

  // --- HTTP/XML API for full status pull ---
  private async pollHttpStatus(): Promise<void> {
    try {
      const httpStatus = await fetchHttpStatus(this.host, this.httpPort);
      this.mergeHttpStatus(httpStatus);
      this.status.lastUpdate = new Date().toISOString();
      this.emit('statusChanged', this.status);
    } catch (err: any) {
      console.error('[Marantz] HTTP poll error:', err.message);
    }
  }

  private mergeHttpStatus(http: any): void {
    // Merge power
    if (http.power) this.status.power = http.power;

    // Merge volume (HTTP returns dB like -30.0, convert to absolute)
    if (http.volume !== undefined) {
      const abs = http.volume + 80;
      this.status.volume = Math.round(abs * 10) / 10;
      const v = this.status.volume;
      this.status.volumeDisplay = Number.isInteger(v) ? String(v) : v.toFixed(1);
    }

    // Merge mute
    if (http.muted !== undefined) this.status.muted = http.muted;

    // Merge input/sources
    if (http.input) this.status.input = http.input;
    if (http.availableInputs?.length) this.status.availableInputs = http.availableInputs;

    // Merge surround mode
    if (http.surroundMode) {
      this.status.surroundMode = http.surroundMode;
      this.status.audio.soundMode = http.surroundMode;
    }

    // Merge Smart Select
    if (http.smartSelect?.length) {
      // Preserve active state from telnet, update names from HTTP
      const activeNum = this.status.smartSelect.find((preset) => preset.active)?.number;
      this.status.smartSelect = http.smartSelect.map((preset: ISmartSelectPreset) => ({
        ...preset,
        active: preset.number === activeNum,
      }));
    }

    // Merge speakers from active speaker query
    if (http.speakers?.length) this.status.speakers = http.speakers;

    // Merge video info
    if (http.video) {
      this.status.video = { ...this.status.video, ...http.video };
    }

    // Merge audio info
    if (http.audio) {
      this.status.audio = { ...this.status.audio, ...http.audio };
    }

    // Merge subwoofers
    if (http.subwoofers?.length) this.status.subwoofers = http.subwoofers;

    // Merge LFE
    if (http.lfeLevel) this.status.lfeLevel = http.lfeLevel;

    // Merge ECO
    if (http.ecoMode) this.status.ecoMode = http.ecoMode;

    // Merge system info from the newer web control interface
    if (http.softwareVersion) this.status.softwareVersion = http.softwareVersion;
    if (http.networkConnection) this.status.networkConnection = http.networkConnection;
    if (http.ipAddress) this.status.ipAddress = http.ipAddress;
  }

  private startHttpPolling(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.pollHttpStatus(), this.pollInterval);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log('[Marantz] Attempting reconnect...');
      this.createSocket();
    }, this.reconnectInterval);
  }

  sendCommand(cmd: string): void {
    if (this.socket && this.connected) {
      this.socket.write(cmd + '\r');
      console.log(`[Marantz] Sent: ${cmd}`);
    } else {
      console.warn(`[Marantz] Not connected, cannot send: ${cmd}`);
    }
  }

  setVolume(vol: number): void {
    const cmd = volumeToCommand(vol);
    this.sendCommand(`MV${cmd}`);
  }

  setInput(sourceId: string): void {
    this.sendCommand(`SI${sourceId}`);
  }

  setSmartSelect(preset: number): void {
    if (preset < 1 || preset > 4) return;
    this.sendCommand(`MSSMART${preset}`);
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.status.connected = false;
  }
}
