/** Must match server `types/eq` constraints and processor graphic EQ range. */
export const EQ_GAIN_MIN_DB = -20;
export const EQ_GAIN_MAX_DB = 6;

export const EQ_SEGMENT_STEP_DB = 1;

/** One UI row per integer dB step (−20 … +6 inclusive). */
export const EQ_SEGMENT_COUNT =
  Math.round((EQ_GAIN_MAX_DB - EQ_GAIN_MIN_DB) / EQ_SEGMENT_STEP_DB) + 1;

/** Where 0 dB sits in the column: fraction from the top (top = +6 dB, bottom = −20 dB). */
export const EQ_ZERO_DB_TOP_FRACTION =
  (EQ_GAIN_MAX_DB - 0) / (EQ_GAIN_MAX_DB - EQ_GAIN_MIN_DB);

/** Label / rule position: % from top of the column (top = +6 dB, bottom = −20 dB). */
export function eqDbToTopPercent(db: number): number {
  return (
    ((EQ_GAIN_MAX_DB - db) / (EQ_GAIN_MAX_DB - EQ_GAIN_MIN_DB)) * 100
  );
}

/** Clamp to processor range; 0.5 dB steps (matches sliders). */
export function clampEqGainDb(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  const v = Math.round(raw * 2) / 2;
  return Math.min(EQ_GAIN_MAX_DB, Math.max(EQ_GAIN_MIN_DB, v));
}

/** Segment center (dB) for visual row index 0 = bottom (-20 dB). */
export function segmentCenterDb(segmentIndex: number): number {
  return EQ_GAIN_MIN_DB + segmentIndex * EQ_SEGMENT_STEP_DB;
}

/**
 * Lit when this 1 dB row overlaps the filled interval [EQ_GAIN_MIN_DB, gainDb]
 * (fill from bottom of column up to the current gain).
 */
export function isEqSegmentLit(segmentIndex: number, gainDb: number): boolean {
  const g = clampEqGainDb(gainDb);
  const center = segmentCenterDb(segmentIndex);
  const half = EQ_SEGMENT_STEP_DB / 2;
  const segLow = center - half;
  const segHigh = center + half;
  const fillLow = EQ_GAIN_MIN_DB;
  const fillHigh = g;
  return Math.max(segLow, fillLow) <= Math.min(segHigh, fillHigh);
}
