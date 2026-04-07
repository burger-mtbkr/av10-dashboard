import { describe, it, expect } from 'vitest';
import { parseVolume, volumeToCommand, CHANNEL_MAP, SOURCE_MAP, TELNET_EVENT_MAP } from '../constants.js';

describe('parseVolume', () => {
  it('should parse 2-digit integer volume values', () => {
    expect(parseVolume('80')).toBe(0);     // 80 - 80 = 0 dB
    expect(parseVolume('50')).toBe(-30);   // 50 - 80 = -30 dB
    expect(parseVolume('00')).toBe(-80);   // 0 - 80 = -80 dB
    expect(parseVolume('98')).toBe(18);    // 98 - 80 = 18 dB (max)
  });

  it('should parse 3-digit half-step volume values', () => {
    expect(parseVolume('505')).toBe(-29.5);  // 50.5 - 80 = -29.5 dB
    expect(parseVolume('805')).toBe(0.5);    // 80.5 - 80 = 0.5 dB
    expect(parseVolume('995')).toBe(19.5);   // 99.5 - 80 = 19.5 dB
    expect(parseVolume('005')).toBe(-79.5);  // 0.5 - 80 = -79.5 dB
  });

  it('should handle typical listening volumes', () => {
    expect(parseVolume('45')).toBe(-35);    // Quiet
    expect(parseVolume('55')).toBe(-25);    // Normal
    expect(parseVolume('65')).toBe(-15);    // Loud
    expect(parseVolume('455')).toBe(-34.5); // Half-step
  });
});

describe('volumeToCommand', () => {
  it('should convert integer dB to 2-digit command', () => {
    expect(volumeToCommand(0)).toBe('80');
    expect(volumeToCommand(-30)).toBe('50');
    expect(volumeToCommand(-80)).toBe('00');
    expect(volumeToCommand(18)).toBe('98');
    expect(volumeToCommand(-75)).toBe('05');
  });

  it('should convert half-step dB to 3-digit command', () => {
    expect(volumeToCommand(-29.5)).toBe('505');
    expect(volumeToCommand(0.5)).toBe('805');
    expect(volumeToCommand(-79.5)).toBe('005');
    expect(volumeToCommand(-74.5)).toBe('055');
  });

  it('should be the inverse of parseVolume for integer values', () => {
    for (let db = -80; db <= 18; db++) {
      const cmd = volumeToCommand(db);
      expect(parseVolume(cmd)).toBe(db);
    }
  });

  it('should be the inverse of parseVolume for half-step values', () => {
    for (let db = -79.5; db <= 18; db += 1) {
      const cmd = volumeToCommand(db);
      expect(parseVolume(cmd)).toBe(db);
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
  });
});
