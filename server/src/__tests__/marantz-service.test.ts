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

// Mock the http-client module
vi.mock('../http-client.js', () => ({
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
