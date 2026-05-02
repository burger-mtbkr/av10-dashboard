import { describe, it, expect } from 'vitest';
import {
  formatGraphicEqFrequencyHz,
  formatGraphicEqGainDb,
  parseGraphicEqTelnetLine,
} from '../graphic-eq-protocol.js';

describe('graphic-eq-protocol', () => {
  it('formats frequency as 5 digits', () => {
    expect(formatGraphicEqFrequencyHz(63)).toBe('00063');
    expect(formatGraphicEqFrequencyHz(16000)).toBe('16000');
  });

  it('formats gain with sign and one decimal', () => {
    expect(formatGraphicEqGainDb(0)).toBe('+00.0');
    expect(formatGraphicEqGainDb(6)).toBe('+06.0');
    expect(formatGraphicEqGainDb(10)).toBe('+06.0');
    expect(formatGraphicEqGainDb(-3)).toBe('-03.0');
    expect(formatGraphicEqGainDb(-20)).toBe('-20.0');
    expect(formatGraphicEqGainDb(-25)).toBe('-20.0');
  });

  it('parses telnet PSGEQ lines', () => {
    expect(parseGraphicEqTelnetLine('PSGEQ 00063 +00.0')).toEqual({
      frequencyHz: 63,
      gainDb: 0,
    });
    expect(parseGraphicEqTelnetLine('PSGEQ01000-03.5')).toEqual({
      frequencyHz: 1000,
      gainDb: -3.5,
    });
  });
});
