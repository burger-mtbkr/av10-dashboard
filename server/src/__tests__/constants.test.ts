import { describe, it, expect } from 'vitest';
import { parseVolume, volumeToCommand, CHANNEL_MAP, SOURCE_MAP, TELNET_EVENT_MAP, OPINFASP_CHANNEL_ORDER } from '../core/constants.js';

describe('parseVolume', () => {
  it('should parse 2-digit integer volume values', () => {
    expect(parseVolume('80')).toBe(80);
    expect(parseVolume('50')).toBe(50);
    expect(parseVolume('00')).toBe(0);
    expect(parseVolume('98')).toBe(98);
  });

  it('should parse 3-digit half-step volume values', () => {
    expect(parseVolume('505')).toBe(50.5);
    expect(parseVolume('805')).toBe(80.5);
    expect(parseVolume('995')).toBe(99.5);
    expect(parseVolume('005')).toBe(0.5);
  });

  it('should handle typical listening volumes', () => {
    expect(parseVolume('45')).toBe(45);
    expect(parseVolume('55')).toBe(55);
    expect(parseVolume('65')).toBe(65);
    expect(parseVolume('455')).toBe(45.5);
  });
});

describe('volumeToCommand', () => {
  it('should convert integer volume to 2-digit command', () => {
    expect(volumeToCommand(80)).toBe('80');
    expect(volumeToCommand(50)).toBe('50');
    expect(volumeToCommand(0)).toBe('00');
    expect(volumeToCommand(98)).toBe('98');
    expect(volumeToCommand(5)).toBe('05');
  });

  it('should convert half-step volume to 3-digit command', () => {
    expect(volumeToCommand(50.5)).toBe('505');
    expect(volumeToCommand(80.5)).toBe('805');
    expect(volumeToCommand(0.5)).toBe('005');
    expect(volumeToCommand(5.5)).toBe('055');
  });

  it('should be the inverse of parseVolume for integer values', () => {
    for (let vol = 0; vol <= 98; vol++) {
      const cmd = volumeToCommand(vol);
      expect(parseVolume(cmd)).toBe(vol);
    }
  });

  it('should be the inverse of parseVolume for half-step values', () => {
    for (let vol = 0.5; vol <= 98; vol += 1) {
      const cmd = volumeToCommand(vol);
      expect(parseVolume(cmd)).toBe(vol);
    }
  });
});

describe('CHANNEL_MAP', () => {
  it('should contain standard 7.2.4 channels', () => {
    expect(CHANNEL_MAP.FL).toEqual({ name: 'Front Left', group: 'ear' });
    expect(CHANNEL_MAP.FR).toEqual({ name: 'Front Right', group: 'ear' });
    expect(CHANNEL_MAP.C).toEqual({ name: 'Center', group: 'ear' });
    expect(CHANNEL_MAP.SL).toEqual({ name: 'Surround Left', group: 'ear' });
    expect(CHANNEL_MAP.SR).toEqual({ name: 'Surround Right', group: 'ear' });
    expect(CHANNEL_MAP.SW).toEqual({ name: 'Subwoofer', group: 'sub' });
    expect(CHANNEL_MAP.SW2).toEqual({ name: 'Subwoofer 2', group: 'sub' });
  });

  it('should contain Atmos height channels', () => {
    expect(CHANNEL_MAP.TFL.group).toBe('height');
    expect(CHANNEL_MAP.TFR.group).toBe('height');
    expect(CHANNEL_MAP.TML.group).toBe('height');
    expect(CHANNEL_MAP.TMR.group).toBe('height');
    expect(CHANNEL_MAP.TRL.group).toBe('height');
    expect(CHANNEL_MAP.TRR.group).toBe('height');
  });

  it('should contain all 4 subwoofer channels', () => {
    expect(CHANNEL_MAP.SW).toBeDefined();
    expect(CHANNEL_MAP.SW2).toBeDefined();
    expect(CHANNEL_MAP.SW3).toBeDefined();
    expect(CHANNEL_MAP.SW4).toBeDefined();
  });

  it('should categorise all channels into known groups', () => {
    const validGroups = ['ear', 'height', 'sub', 'wide', 'back'];
    for (const [code, info] of Object.entries(CHANNEL_MAP)) {
      expect(validGroups).toContain(info.group);
    }
  });
});

describe('SOURCE_MAP', () => {
  it('should contain common input sources', () => {
    expect(SOURCE_MAP['SAT/CBL']).toBe('CBL/SAT');
    expect(SOURCE_MAP['BD']).toBe('Blu-ray');
    expect(SOURCE_MAP['GAME']).toBe('Game');
    expect(SOURCE_MAP['TV']).toBe('TV Audio');
    expect(SOURCE_MAP['NET']).toBe('NETWORK');
    expect(SOURCE_MAP['BT']).toBe('Bluetooth');
  });

  it('should have at least 10 input sources', () => {
    expect(Object.keys(SOURCE_MAP).length).toBeGreaterThanOrEqual(10);
  });
});

describe('TELNET_EVENT_MAP', () => {
  it('should map standard telnet event prefixes', () => {
    expect(TELNET_EVENT_MAP.MV).toBe('volume');
    expect(TELNET_EVENT_MAP.SI).toBe('input');
    expect(TELNET_EVENT_MAP.MS).toBe('surroundMode');
    expect(TELNET_EVENT_MAP.MU).toBe('muted');
    expect(TELNET_EVENT_MAP.PW).toBe('power');
    expect(TELNET_EVENT_MAP.EC).toBe('ecoMode');
    expect(TELNET_EVENT_MAP.PS).toBe('parameterSetting');
    expect(TELNET_EVENT_MAP.VS).toBe('videoSelect');
    expect(TELNET_EVENT_MAP.OP).toBe('operation');
    expect(TELNET_EVENT_MAP.SPPR).toBe('speakerPreset');
  });
});

describe('OPINFASP_CHANNEL_ORDER', () => {
  it('should have 32 entries', () => {
    expect(OPINFASP_CHANNEL_ORDER).toHaveLength(32);
  });

  it('should start with FL, FR, C, SW', () => {
    expect(OPINFASP_CHANNEL_ORDER.slice(0, 4)).toEqual(['FL', 'FR', 'C', 'SW']);
  });

  it('should contain only valid CHANNEL_MAP codes', () => {
    for (const code of OPINFASP_CHANNEL_ORDER) {
      expect(CHANNEL_MAP[code]).toBeDefined();
    }
  });

  it('should end with SW2 as the last entry', () => {
    expect(OPINFASP_CHANNEL_ORDER[31]).toBe('SW2');
  });
});
