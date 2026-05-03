import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  EQ_GAIN_MAX_DB,
  EQ_GAIN_MIN_DB,
  EQ_SEGMENT_COUNT,
  clampEqGainDb,
  eqDbToTopPercent,
  isEqSegmentLit,
} from "../features/eq";

/** Same height as the bar column — scale ticks must match this. */
const EQ_COLUMN_HEIGHT_PX = 136;

/** Ticks on −20 … +6 dB (positions use eqDbToTopPercent — intentionally sparse for readability). */
const SCALE_MARKS: number[] = [6, 3, 0, -6, -12, -20];

export interface IGraphicEqBandsProps {
  bands: { frequencyHz: number; gainDb: number }[];
  disabled?: boolean;
  /** EQ off in AVR / preset: show flat neutral column (no cyan fill), values +0.0, muted styling. */
  neutralFlat?: boolean;
  formatFrequency: (frequencyHz: number) => string;
  onBandChange: (frequencyHz: number, gainDb: number) => void;
}

const GraphicEqBands = ({
  bands,
  disabled,
  neutralFlat = false,
  formatFrequency,
  onBandChange,
}: IGraphicEqBandsProps) => {
  const sortedBands = [...bands].sort((a, b) => a.frequencyHz - b.frequencyHz);
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  /** High-contrast active fill — bright cyan cap so bars read on dark UI. */
  const litGradient = `linear-gradient(180deg, ${theme.palette.primary.light} 0%, ${primary} 38%, ${theme.palette.primary.dark} 100%)`;
  const litGlow = alpha(primary, 0.65);
  const litBorder = alpha(theme.palette.primary.light, 0.95);
  /** Inactive pills — keep clearly darker than lit fill so “empty” top of column reads as off. */
  const trackMuted = alpha(theme.palette.common.black, 0.55);
  const trackEdge = alpha(theme.palette.common.white, 0.22);
  /** Disabled EQ: no primary/cyan anywhere — flat grey pills only. */
  const neutralPanelBg = alpha(theme.palette.grey[900], 0.72);
  const neutralBorder = alpha(theme.palette.grey[700], 0.55);
  const neutralSegBg = alpha(theme.palette.grey[800], 0.95);
  const neutralSegBorder = alpha(theme.palette.grey[600], 0.5);
  const activeDragRef = useRef<number | null>(null);

  const updateFromPointer = useCallback(
    (frequencyHz: number, clientY: number, height: number, top: number) => {
      const ratio = (top + height - clientY) / height;
      const db =
        EQ_GAIN_MIN_DB +
        ratio * (EQ_GAIN_MAX_DB - EQ_GAIN_MIN_DB);
      onBandChange(frequencyHz, clampEqGainDb(db));
    },
    [onBandChange],
  );

  const handlePointerDown =
    (frequencyHz: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      activeDragRef.current = frequencyHz;
      const col = e.currentTarget.getBoundingClientRect();
      updateFromPointer(frequencyHz, e.clientY, col.height, col.top);
    };

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const hz = activeDragRef.current;
      if (hz === null || disabled) return;
      const col = e.currentTarget.getBoundingClientRect();
      updateFromPointer(hz, e.clientY, col.height, col.top);
    },
    [disabled, updateFromPointer],
  );

  const handlePointerUp = useCallback(() => {
    activeDragRef.current = null;
  }, []);

  if (sortedBands.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No EQ bands loaded. Pick speaker preset 1 or 2 and ensure profiles load from the server.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        gap: 0.75,
        alignItems: "stretch",
        borderRadius: 1.5,
        p: 1,
        pr: 0.5,
        ...(neutralFlat
          ? {
              background: neutralPanelBg,
              border: `1px solid ${neutralBorder}`,
              boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.black, 0.35)}`,
            }
          : {
              background: `linear-gradient(165deg, ${alpha(primary, 0.09)} 0%, ${theme.palette.background.paper} 42%, ${theme.palette.background.default} 100%)`,
              border: `1px solid ${alpha(primary, 0.18)}`,
              boxShadow: `inset 0 1px 0 ${alpha(primary, 0.06)}, 0 0 24px ${alpha(primary, 0.04)}`,
            }),
        ...(disabled && !neutralFlat
          ? {
              opacity: 0.52,
              filter: "grayscale(0.82)",
              transition: "opacity 160ms ease, filter 160ms ease",
            }
          : {}),
      }}
    >
      {/* dB scale — positions match bar mapping (+6 top … −20 bottom) */}
      <Box
        sx={{
          position: "relative",
          height: EQ_COLUMN_HEIGHT_PX,
          pr: 1,
          pl: 0.25,
          minWidth: 44,
          flexShrink: 0,
          alignSelf: "flex-start",
          borderRight: `1px solid ${
            neutralFlat ? alpha(theme.palette.grey[700], 0.45) : alpha(theme.palette.divider, 0.35)
          }`,
        }}
      >
        {SCALE_MARKS.map((db) => (
          <Typography
            key={db}
            component="span"
            sx={{
              position: "absolute",
              right: 8,
              left: 0,
              top: `${eqDbToTopPercent(db)}%`,
              transform: "translateY(-50%)",
              display: "block",
              fontSize: 12,
              lineHeight: 1.15,
              fontWeight: 500,
              textAlign: "right",
              color: alpha(theme.palette.text.secondary, neutralFlat ? 0.75 : 0.92),
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.02em",
            }}
          >
            {db > 0 ? `+${db}` : `${db}`}
          </Typography>
        ))}
      </Box>

      {/* Bars + zero line */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          overflowX: "auto",
          overflowY: "hidden",
          pb: 0.25,
          mx: -0.25,
          px: 0.25,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Box
          sx={{
            position: "relative",
            minWidth: "100%",
            width: "max-content",
            display: "flex",
            flexDirection: "column",
            gap: 0.35,
          }}
        >
          <Box
            sx={{
              position: "relative",
              height: EQ_COLUMN_HEIGHT_PX,
              minWidth: Math.max(280, sortedBands.length * 19),
            }}
          >
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${eqDbToTopPercent(0)}%`,
                transform: "translateY(-50%)",
                height: "2px",
                backgroundColor: neutralFlat
                  ? alpha(theme.palette.text.secondary, 0.4)
                  : alpha(theme.palette.primary.light, 0.55),
                boxShadow: neutralFlat ? "none" : `0 0 8px ${alpha(primary, 0.35)}`,
                zIndex: 1,
                pointerEvents: "none",
              }}
            />
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "stretch",
                gap: 0.35,
                height: "100%",
              }}
            >
              {sortedBands.map((band) => (
                <Box
                  key={`bar-${band.frequencyHz}`}
                  role="slider"
                  aria-valuemin={EQ_GAIN_MIN_DB}
                  aria-valuemax={EQ_GAIN_MAX_DB}
                  aria-valuenow={
                    neutralFlat
                      ? 0
                      : Number.isFinite(Number(band.gainDb))
                        ? Number(band.gainDb)
                        : 0
                  }
                  aria-label={`${formatFrequency(band.frequencyHz)} gain`}
                  tabIndex={disabled ? -1 : 0}
                  onPointerDown={handlePointerDown(band.frequencyHz)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onKeyDown={(e) => {
                    if (disabled) return;
                    const raw = Number(band.gainDb);
                    let next = Number.isFinite(raw) ? clampEqGainDb(raw) : 0;
                    if (e.key === "ArrowUp" || e.key === "ArrowRight") next += 0.5;
                    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") next -= 0.5;
                    else if (e.key === "Home") next = EQ_GAIN_MIN_DB;
                    else if (e.key === "End") next = EQ_GAIN_MAX_DB;
                    else return;
                    e.preventDefault();
                    onBandChange(band.frequencyHz, clampEqGainDb(next));
                  }}
                  sx={{
                    flex: "1 1 0",
                    minWidth: 16,
                    maxWidth: 28,
                    cursor: disabled ? "default" : "ns-resize",
                    touchAction: "none",
                    display: "grid",
                    gridTemplateRows: `repeat(${EQ_SEGMENT_COUNT}, minmax(0, 1fr))`,
                    gap: "2px",
                    borderRadius: 0.5,
                    outline: "none",
                    minHeight: 0,
                    "&:focus-visible": neutralFlat
                      ? {
                          boxShadow: `0 0 0 2px ${alpha(theme.palette.grey[500], 0.5)}`,
                          borderRadius: 0.5,
                        }
                      : {
                          boxShadow: `0 0 0 2px ${alpha(primary, 0.45)}`,
                          borderRadius: 0.5,
                        },
                  }}
                >
                  {Array.from({ length: EQ_SEGMENT_COUNT }, (_, i) => {
                    if (neutralFlat) {
                      return (
                        <Box
                          key={i}
                          sx={{
                            gridRow: EQ_SEGMENT_COUNT - i,
                            minHeight: 0,
                            width: "100%",
                            borderRadius: 999,
                            border: `1px solid ${neutralSegBorder}`,
                            background: neutralSegBg,
                            boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.black, 0.35)}`,
                          }}
                        />
                      );
                    }
                    const lit = isEqSegmentLit(i, Number(band.gainDb));
                    return (
                      <Box
                        key={i}
                        sx={{
                          gridRow: EQ_SEGMENT_COUNT - i,
                          minHeight: 0,
                          width: "100%",
                          borderRadius: 999,
                          border: lit ? `1px solid ${litBorder}` : `1px solid ${trackEdge}`,
                          background: lit ? litGradient : trackMuted,
                          boxShadow: lit
                            ? `0 0 10px ${litGlow}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.28)}`
                            : `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.05)}`,
                          transition:
                            "background 90ms ease, box-shadow 90ms ease, border-color 90ms ease",
                        }}
                      />
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 0.35,
              minWidth: Math.max(280, sortedBands.length * 19),
            }}
          >
            {sortedBands.map((band) => (
              <Box
                key={`lbl-${band.frequencyHz}`}
                sx={{
                  flex: "1 1 0",
                  minWidth: 16,
                  maxWidth: 28,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.15,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 10,
                    lineHeight: 1.1,
                    color: alpha(theme.palette.text.primary, 0.82),
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    fontWeight: 500,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {formatFrequency(band.frequencyHz)}
                </Typography>
                {!neutralFlat && (
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      color: theme.palette.primary.light,
                      lineHeight: 1.1,
                    }}
                  >
                    {(() => {
                      const g = clampEqGainDb(Number(band.gainDb));
                      return `${g >= 0 ? "+" : ""}${g.toFixed(1)}`;
                    })()}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default GraphicEqBands;
