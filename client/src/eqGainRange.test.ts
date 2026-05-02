import { describe, expect, it } from "vitest";
import {
  EQ_GAIN_MAX_DB,
  EQ_GAIN_MIN_DB,
  EQ_SEGMENT_COUNT,
  EQ_ZERO_DB_TOP_FRACTION,
  clampEqGainDb,
  eqDbToTopPercent,
  isEqSegmentLit,
  segmentCenterDb,
} from "./eqGainRange";

describe("clampEqGainDb", () => {
  it("rounds to 0.5 and clamps to −20…+6", () => {
    expect(clampEqGainDb(4.24)).toBe(4);
    expect(clampEqGainDb(4.25)).toBe(4.5);
    expect(clampEqGainDb(30)).toBe(EQ_GAIN_MAX_DB);
    expect(clampEqGainDb(-100)).toBe(EQ_GAIN_MIN_DB);
  });
});

describe("isEqSegmentLit", () => {
  it("lights from bottom up to gain (inclusive of overlapping row)", () => {
    // +4 dB: row centered at 4 is lit; +5 and +6 rows not.
    const idx4 = (4 - EQ_GAIN_MIN_DB) / 1;
    expect(isEqSegmentLit(idx4, 4)).toBe(true);
    const idx5 = (5 - EQ_GAIN_MIN_DB) / 1;
    expect(isEqSegmentLit(idx5, 4)).toBe(false);

    const idxNeg3 = (-3 - EQ_GAIN_MIN_DB) / 1;
    expect(isEqSegmentLit(idxNeg3, -3)).toBe(true);
    expect(isEqSegmentLit(idxNeg3, -4)).toBe(false);
  });

  it("boundary segments", () => {
    const bottom = 0;
    expect(isEqSegmentLit(bottom, EQ_GAIN_MIN_DB)).toBe(true);
    const top = EQ_SEGMENT_COUNT - 1;
    expect(segmentCenterDb(top)).toBe(EQ_GAIN_MAX_DB);
    expect(isEqSegmentLit(top, EQ_GAIN_MAX_DB)).toBe(true);
  });
});

describe("EQ_ZERO_DB_TOP_FRACTION", () => {
  it("places 0 dB below mid-column for asymmetric range", () => {
    expect(EQ_ZERO_DB_TOP_FRACTION).toBeCloseTo(6 / 26, 6);
  });
});

describe("eqDbToTopPercent", () => {
  it("aligns 0 dB with EQ_ZERO_DB_TOP_FRACTION", () => {
    expect(eqDbToTopPercent(0) / 100).toBeCloseTo(EQ_ZERO_DB_TOP_FRACTION, 6);
    expect(eqDbToTopPercent(EQ_GAIN_MAX_DB)).toBe(0);
    expect(eqDbToTopPercent(EQ_GAIN_MIN_DB)).toBe(100);
  });
});
