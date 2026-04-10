import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarantzService } from '../marantz-service.js';

// Mock net module to avoid real TCP connections
vi.mock('net', () => {
  const createMockSocket = () => ({
    setEncoding: vi.fn(),
    on: vi.fn(),
    connect: vi.fn(),
    write: vi.fn(),
    removeAllListeners: vi.fn(),
    destroy: vi.fn(),
  });
  const SocketCtor = vi.fn(createMockSocket);
  return {
    Socket: SocketCtor,
    default: { Socket: SocketCtor },
  };
});

// Mock the HTTP status API module
vi.mock('../api/index.js', () => ({
  fetchHttpStatus: vi.fn().mockResolvedValue({}),
}));

describe('MarantzService', () => {
  let service: MarantzService;

  beforeEach(() => {
    service = new MarantzService('192.168.1.100', 23, 8080, 10000, 30000);
  });

  afterEach(() => {
    service.disconnect();
    vi.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should return a deep copy of the default status', () => {
      const status = service.getStatus();
      expect(status.power).toBe('OFF');
      expect(status.volume).toBe(0);
      expect(status.muted).toBe(false);
      expect(status.connected).toBe(false);
      expect(status.speakerPreset).toBeNull();
      expect(status.speakers).toEqual([]);
      expect(status.subwoofers).toEqual([]);
    });

    it('should return a deep copy (mutations do not affect internal state)', () => {
      const status1 = service.getStatus();
      status1.volume = 0;
      status1.video.inputResolution = '4K';
      status1.speakers.push({ code: 'FL', name: 'Front Left', active: true, group: 'ear' });

      const status2 = service.getStatus();
      expect(status2.volume).toBe(0);
      expect(status2.video.inputResolution).toBe('---');
      expect(status2.speakers).toEqual([]);
    });
  });

  describe('sendCommand', () => {
    it('should not throw when not connected', () => {
      expect(() => service.sendCommand('MV50')).not.toThrow();
    });

    it('should write to the socket when connected', () => {
      const write = vi.fn();
      (service as any).socket = {
        write,
        removeAllListeners: vi.fn(),
        destroy: vi.fn(),
      };
      (service as any).connected = true;

      service.sendCommand('MV50');

      expect(write).toHaveBeenCalledWith('MV50\r');
    });
  });

  describe('setVolume', () => {
    it('should not throw when not connected', () => {
      expect(() => service.setVolume(-30)).not.toThrow();
    });
  });

  describe('setInput', () => {
    it('should not throw when not connected', () => {
      expect(() => service.setInput('SAT/CBL')).not.toThrow();
    });
  });

  describe('setSpeakerPreset', () => {
    it('should send telnet SPPR command and schedule refresh burst', async () => {
      const sendCommand = vi.spyOn(service, 'sendCommand').mockImplementation(() => {});
      const scheduleSpeakerPresetRefreshBurst = vi.spyOn(service as any, 'scheduleSpeakerPresetRefreshBurst').mockImplementation(() => {});

      await service.setSpeakerPreset(2);

      expect(service.getStatus().speakerPreset).toBe(2);
      expect(sendCommand).toHaveBeenCalledWith('SPPR 2');
      expect(scheduleSpeakerPresetRefreshBurst).toHaveBeenCalledTimes(1);
    });

    it('should clear speakerLayout, speakers, and save preSwitchSpeakerLayout on preset change', async () => {
      vi.spyOn(service, 'sendCommand').mockImplementation(() => {});
      vi.spyOn(service as any, 'scheduleSpeakerPresetRefreshBurst').mockImplementation(() => {});
      (service as any).status.speakerLayout = '7.2.4';
      (service as any).status.speakers = [
        { code: 'FL', name: 'Front Left', active: true, group: 'ear' },
      ];

      await service.setSpeakerPreset(2);

      expect(service.getStatus().speakerLayout).toBe('');
      expect(service.getStatus().speakers).toHaveLength(0);
      expect((service as any).preSwitchSpeakerLayout).toBe('7.2.4');
    });

    it('should ignore invalid speaker preset values', async () => {
      const sendCommand = vi.spyOn(service, 'sendCommand').mockImplementation(() => {});

      await service.setSpeakerPreset(0);
      await service.setSpeakerPreset(3);

      expect(service.getStatus().speakerPreset).toBeNull();
      expect(sendCommand).not.toHaveBeenCalled();
    });

    it('should schedule multiple follow-up refreshes after changing speaker preset', async () => {
      vi.useFakeTimers();
      const refreshStatus = vi.spyOn(service, 'refreshStatus').mockResolvedValue(undefined);

      (service as any).scheduleSpeakerPresetRefreshBurst();
      vi.runAllTimers();

      expect(refreshStatus).toHaveBeenCalledTimes(10);
      vi.useRealTimers();
    });
  });

  describe('disconnect', () => {
    it('should set connected to false', () => {
      service.disconnect();
      const status = service.getStatus();
      expect(status.connected).toBe(false);
    });

    it('should be safe to call multiple times', () => {
      service.disconnect();
      service.disconnect();
      expect(service.getStatus().connected).toBe(false);
    });

    it('should clean up socket listeners and destroy the socket', () => {
      const removeAllListeners = vi.fn();
      const destroy = vi.fn();
      (service as any).socket = { removeAllListeners, destroy };

      service.disconnect();

      expect(removeAllListeners).toHaveBeenCalledTimes(1);
      expect(destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('connect and reconnect helpers', () => {
    it('should create the socket, poll HTTP state, and start polling on connect', async () => {
      const createSocket = vi.spyOn(service as any, 'createSocket').mockImplementation(() => {});
      const refreshStatus = vi.spyOn(service, 'refreshStatus').mockResolvedValue(undefined);
      const startHttpPolling = vi.spyOn(service as any, 'startHttpPolling').mockImplementation(() => {});

      await service.connect();

      expect(createSocket).toHaveBeenCalledTimes(1);
      expect(refreshStatus).toHaveBeenCalledTimes(1);
      expect(startHttpPolling).toHaveBeenCalledTimes(1);
    });

    it('should expose refreshStatus as a public immediate HTTP refresh', async () => {
      const pollHttpStatus = vi.spyOn(service as any, 'pollHttpStatus').mockResolvedValue(undefined);

      await service.refreshStatus();

      expect(pollHttpStatus).toHaveBeenCalledTimes(1);
    });

    it('should schedule a reconnect attempt', () => {
      vi.useFakeTimers();
      const createSocket = vi.spyOn(service as any, 'createSocket').mockImplementation(() => {});

      (service as any).scheduleReconnect();
      vi.advanceTimersByTime(10000);

      expect(createSocket).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  describe('telnet event handling (via internal methods)', () => {
    // We test the effect of telnet events by simulating what processBuffer would do
    // Since updateStatusFromEvent is private, we use the service's event emitter
    // to verify that events trigger statusChanged

    it('should emit statusChanged when processing events', () => {
      const listener = vi.fn();
      service.on('statusChanged', listener);

      // Simulate by accessing the private method via bracket notation
      (service as any).updateStatusFromEvent('PW', 'ON');
      expect(listener).toHaveBeenCalledTimes(1);

      const status = service.getStatus();
      expect(status.power).toBe('ON');
    });

    it('should handle power ON event', () => {
      (service as any).updateStatusFromEvent('PW', 'ON');
      expect(service.getStatus().power).toBe('ON');
    });

    it('should handle power STANDBY event', () => {
      (service as any).updateStatusFromEvent('PW', 'STANDBY');
      expect(service.getStatus().power).toBe('STANDBY');
    });

    it('should handle zone main ON/OFF events', () => {
      (service as any).updateStatusFromEvent('ZM', 'ON');
      expect(service.getStatus().power).toBe('ON');

      (service as any).updateStatusFromEvent('ZM', 'OFF');
      expect(service.getStatus().power).toBe('OFF');
    });

    it('should handle volume events', () => {
      (service as any).updateStatusFromEvent('MV', '50');
      const status = service.getStatus();
      expect(status.volume).toBe(50);
      expect(status.volumeDisplay).toBe('50');
    });

    it('should handle volume with half-step', () => {
      (service as any).updateStatusFromEvent('MV', '505');
      expect(service.getStatus().volume).toBe(50.5);
    });

    it('should handle volume max events', () => {
      (service as any).updateStatusFromEvent('MV', 'MAX 80');
      expect(service.getStatus().maxVolume).toBe(80);
    });

    it('should handle mute ON', () => {
      (service as any).updateStatusFromEvent('MU', 'ON');
      expect(service.getStatus().muted).toBe(true);
    });

    it('should handle mute OFF', () => {
      (service as any).updateStatusFromEvent('MU', 'OFF');
      expect(service.getStatus().muted).toBe(false);
    });

    it('should handle input selection', () => {
      (service as any).updateStatusFromEvent('SI', 'SAT/CBL');
      const status = service.getStatus();
      expect(status.input.id).toBe('SAT/CBL');
      expect(status.input.selected).toBe(true);
    });

    it('should handle surround mode', () => {
      (service as any).updateStatusFromEvent('MS', 'DOLBY ATMOS');
      const status = service.getStatus();
      expect(status.surroundMode).toBe('DOLBY ATMOS');
      expect(status.audio.soundMode).toBe('DOLBY ATMOS');
    });

    it('should handle ECO mode events', () => {
      (service as any).updateStatusFromEvent('EC', 'ON');
      expect(service.getStatus().ecoMode).toBe('ON');

      (service as any).updateStatusFromEvent('EC', 'AUTO');
      expect(service.getStatus().ecoMode).toBe('AUTO');

      (service as any).updateStatusFromEvent('EC', 'OFF');
      expect(service.getStatus().ecoMode).toBe('OFF');
    });

    it('should handle SPPR speaker preset events', () => {
      (service as any).updateStatusFromEvent('SPPR', '1');
      expect(service.getStatus().speakerPreset).toBe(1);

      (service as any).updateStatusFromEvent('SPPR', '2');
      expect(service.getStatus().speakerPreset).toBe(2);
    });

    it('should update speakerPreset from SPPR but keep pendingSpeakerPreset for HTTP hold guard', () => {
      const timers = [setTimeout(() => {}, 10000), setTimeout(() => {}, 10000)];
      (service as any).pendingSpeakerPreset = 2;
      (service as any).speakerPresetRefreshTimers = timers;

      (service as any).updateStatusFromEvent('SPPR', '2');

      expect(service.getStatus().speakerPreset).toBe(2);
      // pendingSpeakerPreset stays — only mergeHttpStatus should clear it
      expect((service as any).pendingSpeakerPreset).toBe(2);
      // Burst timers still running for layout polling
      expect((service as any).speakerPresetRefreshTimers).toHaveLength(2);

      // Clean up
      for (const t of timers) clearTimeout(t);
    });
  });

  describe('parameter settings (PS)', () => {
    it('should handle subwoofer level', () => {
      (service as any).handleParameterSetting('SWL 50');
      const status = service.getStatus();
      expect(status.subwoofers).toHaveLength(1);
      expect(status.subwoofers[0].number).toBe(1);
      expect(status.subwoofers[0].level).toBe('0.0 dB');
      expect(status.subwoofers[0].active).toBe(true);
    });

    it('should handle subwoofer 2 level', () => {
      (service as any).handleParameterSetting('SWL2 53');
      const status = service.getStatus();
      expect(status.subwoofers).toHaveLength(1);
      expect(status.subwoofers[0].number).toBe(2);
      expect(status.subwoofers[0].level).toBe('+3.0 dB');
    });

    it('should handle negative subwoofer level', () => {
      (service as any).handleParameterSetting('SWL 38');
      const status = service.getStatus();
      expect(status.subwoofers[0].level).toBe('-12.0 dB');
    });

    it('should update existing subwoofer on repeated events', () => {
      (service as any).handleParameterSetting('SWL 50');
      (service as any).handleParameterSetting('SWL 55');
      const status = service.getStatus();
      expect(status.subwoofers).toHaveLength(1);
      expect(status.subwoofers[0].level).toBe('+5.0 dB');
    });

    it('should handle LFE level', () => {
      (service as any).handleParameterSetting('LFE 00');
      expect(service.getStatus().lfeLevel).toBe('0 dB');

      (service as any).handleParameterSetting('LFE -5');
      expect(service.getStatus().lfeLevel).toBe('-5 dB');
    });

    it('should handle Dynamic EQ', () => {
      (service as any).handleParameterSetting('DYNEQ ON');
      expect(service.getStatus().audio.dynamicEq).toBe('ON');
    });

    it('should handle Dynamic Volume', () => {
      (service as any).handleParameterSetting('DYNVOL MED');
      expect(service.getStatus().audio.dynamicVolume).toBe('MED');
    });

    it('should handle MultEQ', () => {
      (service as any).handleParameterSetting('MULTEQ:AUDYSSEY');
      expect(service.getStatus().audio.multEq).toBe('AUDYSSEY');
    });

    it('should leave unhandled SWR settings unchanged', () => {
      const before = service.getStatus();
      (service as any).handleParameterSetting('SWR ON');
      expect(service.getStatus()).toMatchObject(before);
    });
  });

  describe('video settings (VS)', () => {
    it('should handle HDMI monitor output AUTO', () => {
      (service as any).handleVideoSetting('MONIAUTO');
      expect(service.getStatus().video.hdmiOutput).toBe('Auto');
    });

    it('should handle HDMI monitor output 1', () => {
      (service as any).handleVideoSetting('MONI1');
      expect(service.getStatus().video.hdmiOutput).toBe('HDMI 1');
    });

    it('should handle HDMI monitor output 2', () => {
      (service as any).handleVideoSetting('MONI2');
      expect(service.getStatus().video.hdmiOutput).toBe('HDMI 2');
    });
  });

  describe('operation events (OP)', () => {
    it('should parse OPINFASP with all speakers active and compute layout', () => {
      // 7.1.4 layout: FL FR C SW SL SR SBL SBR + 4 height
      (service as any).handleOperationEvent('INFASP 22222222000000000000000220022000');
      const status = service.getStatus();
      expect(status.speakers).toHaveLength(12);
      expect(status.speakers.every((s: any) => s.active)).toBe(true);
      expect(status.speakerLayout).toBe('7.1.4');
    });

    it('should use subwoofer count when it exceeds OPINFASP sub channels', () => {
      // Simulate 2 physical subs already tracked via SWL telnet events
      (service as any).status.subwoofers = [
        { number: 1, level: '0.0 dB', active: true },
        { number: 2, level: '0.0 dB', active: true },
      ];
      // OPINFASP only reports a single SW channel
      (service as any).handleOperationEvent('INFASP 22222222000000000000000220022000');
      const status = service.getStatus();
      expect(status.speakerLayout).toBe('7.2.4');
    });

    it('should distinguish configured (1) from active (2) speakers', () => {
      // FL=2(active), FR=1(configured), C=0(not in layout)
      (service as any).handleOperationEvent('INFASP 21000000000000000000000000000000');
      const status = service.getStatus();
      expect(status.speakers).toHaveLength(2);
      expect(status.speakers.find((s: any) => s.code === 'FL')?.active).toBe(true);
      expect(status.speakers.find((s: any) => s.code === 'FR')?.active).toBe(false);
    });

    it('should ignore positions with value 0', () => {
      (service as any).handleOperationEvent('INFASP 00000000000000000000000000000000');
      const status = service.getStatus();
      expect(status.speakers).toEqual([]);
    });

    it('should parse a 7.2.4 layout with SW2 at position 31', () => {
      // Positions 0-7: FL FR C SW SL SR SBL SBR, position 31: SW2
      // Positions 13-14: TFL TFR, positions 17-18: TRL TRR
      (service as any).handleOperationEvent('INFASP 22222222000002200220000000000002');
      const status = service.getStatus();
      const codes = status.speakers.map((s: any) => s.code);
      expect(codes).toContain('SW');
      expect(codes).toContain('SW2');
      expect(codes).toContain('TFL');
      expect(codes).toContain('TFR');
      expect(codes).toContain('TRL');
      expect(codes).toContain('TRR');
      expect(status.speakers).toHaveLength(13);
      expect(status.speakerLayout).toBe('7.2.4');
    });

    it('should block OPINFASP when layout matches preSwitchSpeakerLayout (stale data)', () => {
      (service as any).pendingSpeakerPreset = 2;
      (service as any).preSwitchSpeakerLayout = '7.1.4';
      (service as any).status.speakerLayout = '';
      (service as any).status.speakers = [];

      // OPINFASP still reflects the old 7.1.4 layout — stale
      (service as any).handleOperationEvent('INFASP 22222222000000000000000220022000');

      expect(service.getStatus().speakers).toHaveLength(0);
      expect(service.getStatus().speakerLayout).toBe('');
      expect((service as any).pendingSpeakerPreset).toBe(2);
    });

    it('should accept OPINFASP and resolve transition when layout changes from pre-switch value', () => {
      (service as any).pendingSpeakerPreset = 2;
      (service as any).preSwitchSpeakerLayout = '7.2.4';
      (service as any).status.speakerLayout = '';
      (service as any).status.speakers = [];

      // New layout is 2.0 (FL + FR only) — different from pre-switch 7.2.4
      (service as any).handleOperationEvent('INFASP 22000000000000000000000000000000');

      expect(service.getStatus().speakers).toHaveLength(2);
      expect(service.getStatus().speakerLayout).toBe('2.0');
      expect((service as any).pendingSpeakerPreset).toBeNull();
      expect((service as any).preSwitchSpeakerLayout).toBeNull();
    });
  });

  describe('smart select (MSQUICK)', () => {
    it('should default to 4 presets, none active', () => {
      const status = service.getStatus();
      expect(status.smartSelect).toHaveLength(4);
      expect(status.smartSelect.every((p: any) => !p.active)).toBe(true);
      expect(status.smartSelect[0].number).toBe(1);
      expect(status.smartSelect[3].number).toBe(4);
    });

    it('should activate a preset on MSQUICK event', () => {
      (service as any).updateStatusFromEvent('MSQUICK', '2');
      const status = service.getStatus();
      expect(status.smartSelect.find((p: any) => p.number === 2)?.active).toBe(true);
      expect(status.smartSelect.filter((p: any) => p.active)).toHaveLength(1);
    });

    it('should switch active preset when a different one is selected', () => {
      (service as any).updateStatusFromEvent('MSQUICK', '1');
      (service as any).updateStatusFromEvent('MSQUICK', '3');
      const status = service.getStatus();
      expect(status.smartSelect.find((p: any) => p.number === 1)?.active).toBe(false);
      expect(status.smartSelect.find((p: any) => p.number === 3)?.active).toBe(true);
    });

    it('should ignore invalid preset numbers', () => {
      (service as any).updateStatusFromEvent('MSQUICK', '5');
      const status = service.getStatus();
      expect(status.smartSelect.every((p: any) => !p.active)).toBe(true);
    });

    it('should not throw when not connected', () => {
      expect(() => (service as any).setSmartSelect(1)).not.toThrow();
    });

    it('should ignore invalid Smart Select values when sending commands', () => {
      const sendCommand = vi.spyOn(service, 'sendCommand');
      (service as any).setSmartSelect(0);
      (service as any).setSmartSelect(5);
      expect(sendCommand).not.toHaveBeenCalled();
    });
  });

  describe('HTTP status merging', () => {
    it('should merge HTTP status and preserve the active smart select preset', () => {
      (service as any).updateStatusFromEvent('MSQUICK', '2');

      (service as any).mergeHttpStatus({
        power: 'ON',
        processorModel: 'Marantz AV10',
        softwareVersion: '8000-2122-F016-8380',
        volume: -25.5,
        muted: true,
        input: { id: 'GAME', name: 'Console', selected: true },
        availableInputs: [
          { id: 'GAME', name: 'Console', selected: true },
          { id: 'BD', name: 'Blu-ray', selected: false },
        ],
        surroundMode: 'AURO-3D',
        smartSelect: [
          { number: 1, name: 'Movie', active: false },
          { number: 2, name: 'Gaming', active: false },
          { number: 3, name: 'Music', active: false },
          { number: 4, name: 'Night', active: false },
        ],
        speakerPreset: 2,
        speakers: [
          { code: 'FL', name: 'Front Left', active: true, group: 'ear' },
          { code: 'FR', name: 'Front Right', active: true, group: 'ear' },
          { code: 'C', name: 'Center', active: true, group: 'ear' },
          { code: 'SL', name: 'Surround Left', active: true, group: 'ear' },
          { code: 'SR', name: 'Surround Right', active: true, group: 'ear' },
          { code: 'SBL', name: 'Surround Back Left', active: true, group: 'back' },
          { code: 'SBR', name: 'Surround Back Right', active: true, group: 'back' },
          { code: 'SW', name: 'Subwoofer', active: true, group: 'sub' },
          { code: 'SW2', name: 'Subwoofer 2', active: true, group: 'sub' },
          { code: 'TFL', name: 'Top Front Left', active: true, group: 'height' },
          { code: 'TFR', name: 'Top Front Right', active: true, group: 'height' },
          { code: 'TRL', name: 'Top Rear Left', active: true, group: 'height' },
          { code: 'TRR', name: 'Top Rear Right', active: true, group: 'height' },
        ],
        video: { inputResolution: '2160p', outputResolution: '2160p', hdrFormat: 'HDR10', inputSignal: 'HDMI' },
        audio: { inputFormat: 'PCM', soundMode: 'AURO-3D', samplingRate: '96kHz' },
        subwoofers: [{ number: 1, level: '+2.0 dB', active: true }],
        lfeLevel: '-4 dB',
        ecoMode: 'AUTO',
        networkConnection: 'Ethernet',
        ipAddress: '192.168.1.170',
      });

      const status = service.getStatus();
      expect(status.power).toBe('ON');
      expect(status.processorModel).toBe('Marantz AV10');
      expect(status.softwareVersion).toBe('8000-2122-F016-8380');
      expect(status.volume).toBe(54.5);
      expect(status.volumeDisplay).toBe('54.5');
      expect(status.muted).toBe(true);
      expect(status.input).toEqual({ id: 'GAME', name: 'Console', selected: true });
      expect(status.availableInputs[0]).toMatchObject({ id: 'GAME', selected: true });
      expect(status.surroundMode).toBe('AURO-3D');
      expect(status.audio.soundMode).toBe('AURO-3D');
      expect(status.smartSelect.find((preset: any) => preset.number === 2)?.active).toBe(true);
      expect(status.smartSelect.find((preset: any) => preset.number === 2)?.name).toBe('Gaming');
      expect(status.speakerPreset).toBe(2);
      expect(status.speakerLayout).toBe('7.2.4');
      expect(status.speakers).toHaveLength(13);
      expect(status.video).toMatchObject({ hdrFormat: 'HDR10', inputResolution: '2160p' });
      expect(status.audio).toMatchObject({ inputFormat: 'PCM', samplingRate: '96kHz' });
      expect(status.subwoofers[0]).toMatchObject({ level: '+2.0 dB' });
      expect(status.lfeLevel).toBe('-4 dB');
      expect(status.ecoMode).toBe('AUTO');
      expect(status.networkConnection).toBe('Ethernet');
      expect(status.ipAddress).toBe('192.168.1.170');
    });

    it('should ignore stale speaker data while a preset change is pending', () => {
      (service as any).pendingSpeakerPreset = 2;
      (service as any).preSwitchSpeakerLayout = '7.2.4';
      (service as any).status.speakerPreset = 2;
      (service as any).status.speakerLayout = '';
      (service as any).status.speakers = [];

      (service as any).mergeHttpStatus({
        speakerPreset: 1,
        speakers: [
          { code: 'FL', name: 'Front Left', active: true, group: 'ear' },
          { code: 'FR', name: 'Front Right', active: true, group: 'ear' },
          { code: 'C', name: 'Center', active: true, group: 'ear' },
          { code: 'SW', name: 'Subwoofer', active: true, group: 'sub' },
        ],
      });

      const status = service.getStatus();
      expect(status.speakerPreset).toBe(2);
      expect(status.speakerLayout).toBe('');
      expect(status.speakers).toHaveLength(0);
      expect((service as any).pendingSpeakerPreset).toBe(2);
    });

    it('should block stale layout when HTTP preset matches but layout has not changed', () => {
      (service as any).pendingSpeakerPreset = 2;
      (service as any).preSwitchSpeakerLayout = '7.2.4';
      (service as any).status.speakerPreset = 2;
      (service as any).status.speakerLayout = '';

      // HTTP confirms preset 2, but speakers still reflect the old 7.2.4 layout
      (service as any).mergeHttpStatus({
        speakerPreset: 2,
        speakers: [
          { code: 'FL', name: 'Front Left', active: true, group: 'ear' },
          { code: 'FR', name: 'Front Right', active: true, group: 'ear' },
          { code: 'C', name: 'Center', active: true, group: 'ear' },
          { code: 'SL', name: 'Surround Left', active: true, group: 'ear' },
          { code: 'SR', name: 'Surround Right', active: true, group: 'ear' },
          { code: 'SBL', name: 'Surround Back Left', active: true, group: 'back' },
          { code: 'SBR', name: 'Surround Back Right', active: true, group: 'back' },
          { code: 'SW', name: 'Subwoofer', active: true, group: 'sub' },
          { code: 'SW2', name: 'Subwoofer 2', active: true, group: 'sub' },
          { code: 'TFL', name: 'Top Front Left', active: true, group: 'height' },
          { code: 'TFR', name: 'Top Front Right', active: true, group: 'height' },
          { code: 'TRL', name: 'Top Rear Left', active: true, group: 'height' },
          { code: 'TRR', name: 'Top Rear Right', active: true, group: 'height' },
        ],
      });

      const status = service.getStatus();
      // Layout hasn't changed from pre-switch 7.2.4 → still stale, blocked
      expect(status.speakerLayout).toBe('');
      expect(status.speakers).toHaveLength(0);
      expect((service as any).pendingSpeakerPreset).toBe(2);
    });

    it('should accept speaker data and clear pending once layout changes from pre-switch value', () => {
      (service as any).pendingSpeakerPreset = 2;
      (service as any).preSwitchSpeakerLayout = '7.2.4';
      (service as any).status.speakerPreset = 2;
      (service as any).status.speakerLayout = '';
      const timers = [setTimeout(() => {}, 10000), setTimeout(() => {}, 10000)];
      (service as any).speakerPresetRefreshTimers = timers;

      (service as any).mergeHttpStatus({
        speakerPreset: 2,
        speakers: [
          { code: 'FL', name: 'Front Left', active: true, group: 'ear' },
          { code: 'FR', name: 'Front Right', active: true, group: 'ear' },
          { code: 'SW', name: 'Subwoofer', active: true, group: 'sub' },
        ],
      });

      const status = service.getStatus();
      expect(status.speakerPreset).toBe(2);
      expect(status.speakerLayout).toBe('2.1');
      expect(status.speakers).toHaveLength(3);
      expect((service as any).pendingSpeakerPreset).toBeNull();
      expect((service as any).preSwitchSpeakerLayout).toBeNull();
      expect((service as any).speakerPresetRefreshTimers).toHaveLength(0);
    });

    it('should compute layout from speakers when not transitioning', () => {
      (service as any).mergeHttpStatus({
        speakerPreset: 1,
        speakers: [
          { code: 'FL', name: 'Front Left', active: true, group: 'ear' },
          { code: 'FR', name: 'Front Right', active: true, group: 'ear' },
          { code: 'C', name: 'Center', active: true, group: 'ear' },
          { code: 'SW', name: 'Subwoofer', active: true, group: 'sub' },
          { code: 'TFL', name: 'Top Front Left', active: true, group: 'height' },
          { code: 'TFR', name: 'Top Front Right', active: true, group: 'height' },
        ],
      });

      expect(service.getStatus().speakerPreset).toBe(1);
      expect(service.getStatus().speakerLayout).toBe('3.1.2');
    });

    it('should resolve custom input names before falling back to source ids', () => {
      (service as any).status.availableInputs = [{ id: 'GAME', name: 'Console', selected: false }];

      expect((service as any).resolveInputName('GAME')).toBe('Console');
      expect((service as any).resolveInputName('UNKNOWN')).toBe('UNKNOWN');
    });

    it('should return the raw subwoofer level when parsing fails', () => {
      expect((service as any).parseSubLevel('not-a-number')).toBe('not-a-number');
    });
  });

  describe('processBuffer (telnet line splitting)', () => {
    it('should process CR-terminated lines', () => {
      const listener = vi.fn();
      service.on('statusChanged', listener);

      // Simulate data arriving via telnet
      (service as any).buffer = 'MV50\rMUON\r';
      (service as any).processBuffer();

      expect(listener).toHaveBeenCalled();
      const status = service.getStatus();
      expect(status.volume).toBe(50);
      expect(status.muted).toBe(true);
    });

    it('should handle partial data (no trailing CR)', () => {
      const listener = vi.fn();
      service.on('statusChanged', listener);

      // First chunk — incomplete
      (service as any).buffer = 'MV';
      (service as any).processBuffer();
      expect(listener).not.toHaveBeenCalled();

      // Second chunk completes the line
      (service as any).buffer += '50\r';
      (service as any).processBuffer();
      expect(listener).toHaveBeenCalled();
    });

    it('should handle multiple lines in one data event', () => {
      (service as any).buffer = 'PWON\rMV50\rSISAT/CBL\r';
      (service as any).processBuffer();

      const status = service.getStatus();
      expect(status.power).toBe('ON');
      expect(status.volume).toBe(50);
      expect(status.input.id).toBe('SAT/CBL');
    });
  });
});
