import * as net from 'net';
import { EventEmitter } from 'events';
import { CHANNEL_MAP, OPINFASP_CHANNEL_ORDER, PLACEHOLDER_VALUE, SOURCE_MAP, SMART_SELECT_DEFAULTS, SMART_SELECT_SLOTS, TELNET_EVENT_MAP, parseVolume, volumeToCommand } from './constants.js';
import { fetchHttpStatus } from './api/index.js';
import type { IAVRStatus, IInputSource, ISmartSelectPreset, ISpeakerStatus, ITelnetEvent } from './types.js';
import type { IEqBand, IEqProfile, SpeakerPreset } from './eq/types.js';
import { clampGainDb } from './eq/validators.js';
import {
  formatGraphicEqFrequencyHz,
  formatGraphicEqGainDb,
  parseGraphicEqTelnetLine,
} from './graphic-eq-protocol.js';

export class MarantzService extends EventEmitter {
  private static readonly SPEAKER_PRESET_REFRESH_DELAYS_MS = [100, 300, 600, 1000, 1500, 2000, 3000, 4000, 6000, 8000] as const;

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
  private speakerPresetRefreshTimers: ReturnType<typeof setTimeout>[] = [];
  private pendingSpeakerPreset: 1 | 2 | null = null;
  private preSwitchSpeakerLayout: string | null = null;
  private applyEqInFlight = false;

  private nextTelnetWaiterId = 0;
  private telnetLineWaiters: Array<{
    id: number;
    predicate: (line: string) => boolean;
    resolve: (line: string) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];

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
      processorModel: PLACEHOLDER_VALUE,
      softwareVersion: PLACEHOLDER_VALUE,
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
      speakerPreset: null,
      speakerLayout: '',
      speakers: [],
      video: {
        inputResolution: PLACEHOLDER_VALUE,
        outputResolution: PLACEHOLDER_VALUE,
        hdrFormat: PLACEHOLDER_VALUE,
        inputSignal: PLACEHOLDER_VALUE,
        hdmiOutput: 'Auto',
      },
      audio: {
        inputFormat: PLACEHOLDER_VALUE,
        soundMode: PLACEHOLDER_VALUE,
        samplingRate: PLACEHOLDER_VALUE,
        dialogEnhancer: 'Off',
        dynamicEq: PLACEHOLDER_VALUE,
        dynamicVolume: PLACEHOLDER_VALUE,
        multEq: PLACEHOLDER_VALUE,
      },
      subwoofers: [],
      lfeLevel: '0 dB',
      ecoMode: PLACEHOLDER_VALUE,
      networkConnection: PLACEHOLDER_VALUE,
      ipAddress: PLACEHOLDER_VALUE,
      surroundMode: PLACEHOLDER_VALUE,
      connected: false,
      lastUpdate: new Date().toISOString(),
      graphicEq: null,
    };
  }

  getStatus(): IAVRStatus {
    return JSON.parse(JSON.stringify(this.status));
  }

  async refreshStatus(): Promise<void> {
    await this.pollHttpStatus();
  }

  private computeSpeakerLayout(speakers: ISpeakerStatus[]): string {
    if (speakers.length === 0) return '';
    const earCount = speakers.filter(s => s.group === 'ear' || s.group === 'wide' || s.group === 'back').length;
    const opinfaspSubCount = speakers.filter(s => s.group === 'sub').length;
    // OPINFASP only reports a single SW channel even when multiple physical
    // subwoofers are connected.  Use the larger of the two counts so the
    // layout label reflects the actual speaker configuration (e.g. 7.2.4).
    const subCount = Math.max(opinfaspSubCount, this.status.subwoofers.length);
    const heightCount = speakers.filter(s => s.group === 'height').length;
    return heightCount > 0 ? `${earCount}.${subCount}.${heightCount}` : `${earCount}.${subCount}`;
  }

  private clearSpeakerPresetRefreshTimers(): void {
    for (const timer of this.speakerPresetRefreshTimers) {
      clearTimeout(timer);
    }
    this.speakerPresetRefreshTimers = [];
  }

  private scheduleSpeakerPresetRefreshBurst(): void {
    this.clearSpeakerPresetRefreshTimers();

    for (const delay of MarantzService.SPEAKER_PRESET_REFRESH_DELAYS_MS) {
      const timer = setTimeout(() => {
        void this.refreshStatus().finally(() => {
          this.speakerPresetRefreshTimers = this.speakerPresetRefreshTimers.filter((entry) => entry !== timer);
          // Safety valve: if all burst polls completed without resolving
          // the transition (e.g. both presets have the same layout), accept
          // whatever data is current and clear the hold.
          if (this.speakerPresetRefreshTimers.length === 0 && this.pendingSpeakerPreset !== null) {
            this.pendingSpeakerPreset = null;
            this.preSwitchSpeakerLayout = null;
          }
        });
      }, delay);

      this.speakerPresetRefreshTimers.push(timer);
    }
  }

  async connect(): Promise<void> {
    console.log(`[Marantz] Connecting to ${this.host}:${this.port} (telnet)...`);
    this.createSocket();

    // Also do an initial HTTP poll for full status
    await this.refreshStatus();
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
      this.sendCommand('SPPR ?');
      this.sendCommand('PSDYNEQ ?');
      this.sendCommand('PSDYNVOL ?');
      this.sendCommand('PSMULTEQ: ?');
      this.sendCommand('PSDIL ?');
      this.sendCommand('SYSDA ?');
      this.sendCommand('SSINFAISFSV ?');
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
      if (!trimmed) continue;
      if (this.tryConsumeTelnetWaiter(trimmed)) continue;
      this.handleTelnetEvent(trimmed);
    }
  }

  private tryConsumeTelnetWaiter(line: string): boolean {
    const idx = this.telnetLineWaiters.findIndex((w) => w.predicate(line));
    if (idx === -1) return false;
    const w = this.telnetLineWaiters[idx];
    this.telnetLineWaiters.splice(idx, 1);
    clearTimeout(w.timer);
    w.resolve(line);
    return true;
  }

  /** Wait for a telnet line matching `predicate` (e.g. PSGEQ query response). Register before sending the command. */
  private waitForTelnetLine(predicate: (line: string) => boolean, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = ++this.nextTelnetWaiterId;
      const timer = setTimeout(() => {
        this.telnetLineWaiters = this.telnetLineWaiters.filter((w) => w.id !== id);
        reject(new Error('Timed out waiting for receiver response'));
      }, timeoutMs);
      this.telnetLineWaiters.push({
        id,
        predicate,
        resolve: (ln: string) => resolve(ln),
        timer,
      });
    });
  }

  /**
   * Read graphic EQ band gains from the processor via telnet (PSGEQ nnnnn ?).
   * Switches to the given speaker preset first so EQ matches that preset’s stored curve.
   */
  async readGraphicEqBands(preset: SpeakerPreset, frequenciesHz: number[]): Promise<IEqBand[]> {
    if (!this.socket || !this.connected) {
      throw new Error('Not connected to receiver');
    }
    await this.setSpeakerPreset(preset);
    await new Promise((r) => setTimeout(r, 400));

    const bands: IEqBand[] = [];
    for (const frequencyHz of frequenciesHz) {
      const hz = formatGraphicEqFrequencyHz(frequencyHz);
      const wait = this.waitForTelnetLine((line) => {
        const parsed = parseGraphicEqTelnetLine(line);
        return parsed !== null && parsed.frequencyHz === frequencyHz;
      }, 3500);
      this.sendCommand(`PSGEQ ${hz} ?`);
      const line = await wait;
      const parsed = parseGraphicEqTelnetLine(line);
      if (!parsed) {
        throw new Error(`Could not parse EQ response: ${line}`);
      }
      bands.push({
        frequencyHz,
        gainDb: clampGainDb(parsed.gainDb),
      });
    }

    const adjustmentsEnabled = this.status.graphicEq?.adjustmentsEnabled ?? true;
    this.status.graphicEq = {
      bands: bands.map((b) => ({ ...b })),
      updatedAt: new Date().toISOString(),
      adjustmentsEnabled,
    };
    this.status.lastUpdate = new Date().toISOString();
    this.emit('statusChanged', this.status);
    return bands;
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
        changed = this.handleSystemSettings(parameter);
        break;

      case 'SY':
        changed = this.handleSystemEvent(parameter);
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

      case 'SPPR': {
        const presetNum = parseInt(parameter, 10);
        if (presetNum === 1 || presetNum === 2) {
          this.status.speakerPreset = presetNum;
          // Do NOT clear pendingSpeakerPreset here — that guard must stay active
          // to block stale HTTP poll data until the HTTP endpoint itself confirms
          // the new preset alongside the updated speakerLayout.
          changed = true;
        }
        break;
      }

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
    } else if (param.startsWith('DIL')) {
      this.status.audio.dialogEnhancer = param.replace('DIL ', '').trim();
    } else if (param.startsWith('GEQ')) {
      const compact = param.replace(/\s+/g, '').toUpperCase();
      if (compact === 'GEQOFF') {
        this.setGraphicEqAdjustmentsEnabled(false);
      } else if (compact === 'GEQON') {
        this.setGraphicEqAdjustmentsEnabled(true);
      } else {
        const parsed = parseGraphicEqTelnetLine(`PS${param}`);
        if (parsed) {
          this.mergeGraphicEqBandFromTelnet(parsed);
        }
      }
    }
  }

  /** Graphic EQ bypass/on — preserves band list from last snapshot when toggling. */
  private setGraphicEqAdjustmentsEnabled(enabled: boolean): void {
    const prevBands = this.status.graphicEq?.bands ?? [];
    this.status.graphicEq = {
      bands: prevBands.map((b) => ({ ...b })),
      updatedAt: new Date().toISOString(),
      adjustmentsEnabled: enabled,
    };
  }

  private mergeGraphicEqBandFromTelnet(parsed: { frequencyHz: number; gainDb: number }): void {
    const gainDb = clampGainDb(parsed.gainDb);
    const prev = this.status.graphicEq?.bands ?? [];
    let bands: IEqBand[];
    if (prev.length === 0) {
      bands = [{ frequencyHz: parsed.frequencyHz, gainDb }];
    } else if (prev.some((b) => b.frequencyHz === parsed.frequencyHz)) {
      bands = prev.map((b) =>
        b.frequencyHz === parsed.frequencyHz ? { ...b, gainDb } : b,
      );
    } else {
      bands = [...prev, { frequencyHz: parsed.frequencyHz, gainDb }].sort(
        (a, b) => a.frequencyHz - b.frequencyHz,
      );
    }
    const adjustmentsEnabled = this.status.graphicEq?.adjustmentsEnabled ?? true;
    this.status.graphicEq = {
      bands,
      updatedAt: new Date().toISOString(),
      adjustmentsEnabled,
    };
  }

  private handleSystemSettings(param: string): boolean {
    if (param.startsWith('INFAISFSV ')) {
      const value = param.replace('INFAISFSV ', '').trim();
      if (value && value !== 'NON') {
        // Normalize: receiver may send "48K", "48", or "48 kHz"
        const numeric = value.replace(/\s*[kK](Hz)?$/i, '').trim();
        this.status.audio.samplingRate = `${numeric} kHz`;
      } else {
        this.status.audio.samplingRate = PLACEHOLDER_VALUE;
      }
      return true;
    }
    if (param.startsWith('INFAISSIG ')) {
      return false; // signal type code, not directly displayed
    }
    return false;
  }

  private handleSystemEvent(param: string): boolean {
    if (param.startsWith('SDA ')) {
      const value = param.replace('SDA ', '').trim();
      if (value && value !== 'Unknown') {
        this.status.audio.inputFormat = value;
      } else {
        this.status.audio.inputFormat = PLACEHOLDER_VALUE;
      }
      // Receiver pushes SYSDA but not SSINFAISFSV — re-query sampling rate
      this.sendCommand('SSINFAISFSV ?');
      return true;
    }
    if (param.startsWith('SMI ')) {
      // System mode info (e.g. "Stereo") — duplicates MS event
      return false;
    }
    return false;
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
        if (this.pendingSpeakerPreset === null) {
          this.status.speakers = speakers;
          this.status.speakerLayout = this.computeSpeakerLayout(speakers);
        } else {
          // During a preset transition, accept OPINFASP data once the layout
          // changes from the pre-switch value — this event is pushed by the
          // receiver in real-time as soon as the DSP reconfigures, so it is
          // the fastest path to resolve the transition.
          const computedLayout = this.computeSpeakerLayout(speakers);
          const layoutChanged = this.preSwitchSpeakerLayout === null
            || computedLayout !== this.preSwitchSpeakerLayout;
          if (layoutChanged) {
            this.status.speakers = speakers;
            this.status.speakerLayout = computedLayout;
            this.pendingSpeakerPreset = null;
            this.preSwitchSpeakerLayout = null;
            this.clearSpeakerPresetRefreshTimers();
          }
        }
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
    const pendingSpeakerPreset = this.pendingSpeakerPreset;
    const httpSpeakerPreset = http.speakerPreset as IAVRStatus['speakerPreset'] | undefined;

    // Merge power
    if (http.power) this.status.power = http.power;

    if (http.processorModel) this.status.processorModel = http.processorModel;

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

    // Merge subwoofers BEFORE speaker data so computeSpeakerLayout() sees
    // the correct physical subwoofer count (dual-mono = 2 speakers, 1 OPINFASP channel).
    if (http.subwoofers?.length) this.status.subwoofers = http.subwoofers;

    // Speaker preset, speakers, and layout are guarded during transitions.
    // While pendingSpeakerPreset is active, stale data from the old preset
    // must not contaminate the new preset's status.
    if (pendingSpeakerPreset === null) {
      // No transition — accept all speaker data
      if (httpSpeakerPreset !== undefined) {
        this.status.speakerPreset = httpSpeakerPreset;
      }
      if (http.speakers?.length) {
        this.status.speakers = http.speakers;
        this.status.speakerLayout = this.computeSpeakerLayout(http.speakers);
      }
    } else if (httpSpeakerPreset === pendingSpeakerPreset && http.speakers?.length) {
      // Preset matches the target — check if layout changed (DSP reconfigured)
      const computedLayout = this.computeSpeakerLayout(http.speakers);
      const layoutChanged = this.preSwitchSpeakerLayout === null
        || computedLayout !== this.preSwitchSpeakerLayout;

      if (layoutChanged) {
        this.status.speakerPreset = httpSpeakerPreset;
        this.status.speakers = http.speakers;
        this.status.speakerLayout = computedLayout;
        this.pendingSpeakerPreset = null;
        this.preSwitchSpeakerLayout = null;
        this.clearSpeakerPresetRefreshTimers();
      }
    }

    // Merge video info
    if (http.video) {
      this.status.video = { ...this.status.video, ...http.video };
    }

    // Merge audio info — only overwrite with non-placeholder HTTP values
    // so telnet-sourced data (SYSDA, SSINFAISFSV) is not clobbered
    if (http.audio) {
      const httpAudio = http.audio as unknown as Record<string, string>;
      for (const [key, value] of Object.entries(httpAudio)) {
        if (value && value !== PLACEHOLDER_VALUE) {
          (this.status.audio as unknown as Record<string, string>)[key] = value;
        }
      }
    }

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

  async setSpeakerPreset(preset: number): Promise<void> {
    if (preset < 1 || preset > 2) return;

    this.preSwitchSpeakerLayout = this.status.speakerLayout || null;
    this.pendingSpeakerPreset = preset as 1 | 2;
    this.status.speakerPreset = preset as 1 | 2;
    this.status.speakerLayout = '';
    this.status.speakers = [];
    this.status.lastUpdate = new Date().toISOString();
    this.emit('statusChanged', this.status);

    this.sendCommand(`SPPR ${preset}`);
    this.scheduleSpeakerPresetRefreshBurst();
  }

  async applyEqProfile(preset: SpeakerPreset, profile: IEqProfile): Promise<{ sent: number; profileId: string }> {
    if (this.applyEqInFlight) {
      throw new Error('EQ apply already in progress');
    }
    this.applyEqInFlight = true;
    try {
      if (this.status.speakerPreset !== preset) {
        await this.setSpeakerPreset(preset);
        await new Promise((r) => setTimeout(r, 400));
      }
      for (const band of profile.bands) {
        const hz = formatGraphicEqFrequencyHz(band.frequencyHz);
        const gain = formatGraphicEqGainDb(band.gainDb);
        this.sendCommand(`PSGEQ ${hz} ${gain}`);
        await new Promise((r) => setTimeout(r, 80));
      }
      this.status.graphicEq = {
        bands: profile.bands.map((b) => ({
          frequencyHz: b.frequencyHz,
          gainDb: clampGainDb(b.gainDb),
        })),
        updatedAt: new Date().toISOString(),
        adjustmentsEnabled: true,
      };
      this.status.lastUpdate = new Date().toISOString();
      this.emit('statusChanged', this.status);
      return { sent: profile.bands.length, profileId: profile.id };
    } finally {
      this.applyEqInFlight = false;
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.clearSpeakerPresetRefreshTimers();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.status.connected = false;
  }
}
