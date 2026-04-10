import {
  Card,
  CardContent,
  Typography,
  Box,
  ButtonBase,
  Chip,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import TuneIcon from "@mui/icons-material/Tune";
import SpeakerIcon from "@mui/icons-material/Speaker";
import PersonPinCircleIcon from "@mui/icons-material/PersonPinCircle";
import type { ISpeakerStatus } from "../types";

interface ISpeakerPresetCardProps {
  speakerPreset: 1 | 2 | null;
  speakers: ISpeakerStatus[];
  speakerLayout: string;
  layoutPending?: boolean;
  onSelectPreset: (preset: 1 | 2) => void;
}

const PRESETS = [1, 2] as const;

const SPEAKER_POSITIONS: Record<string, { x: number; y: number }> = {
  FWL: { x: 3, y: 8 },
  FL: { x: 18, y: 8 },
  SW3: { x: 32, y: 8 },
  SW: { x: 40, y: 8 },
  C: { x: 50, y: 8 },
  SW2: { x: 60, y: 8 },
  SW4: { x: 68, y: 8 },
  FR: { x: 82, y: 8 },
  FWR: { x: 97, y: 8 },
  FHL: { x: 18, y: 26 },
  TFL: { x: 35, y: 26 },
  FDL: { x: 35, y: 26 },
  TFR: { x: 65, y: 26 },
  FDR: { x: 65, y: 26 },
  FHR: { x: 82, y: 26 },
  SDL: { x: 18, y: 35 },
  TML: { x: 35, y: 35 },
  CH: { x: 50, y: 35 },
  TS: { x: 50, y: 35 },
  TMR: { x: 65, y: 35 },
  SDR: { x: 82, y: 35 },
  SL: { x: 18, y: 44 },
  SR: { x: 82, y: 44 },
  SHL: { x: 18, y: 62 },
  RHL: { x: 18, y: 62 },
  SHR: { x: 82, y: 62 },
  RHR: { x: 82, y: 62 },
  SBL: { x: 35, y: 80 },
  TRL: { x: 35, y: 80 },
  BDL: { x: 35, y: 80 },
  TRR: { x: 65, y: 80 },
  BDR: { x: 65, y: 80 },
  SBR: { x: 65, y: 80 },
  SB: { x: 50, y: 92 },
};

const SpeakerBlock = ({
  speaker,
  x,
  y,
}: {
  speaker: ISpeakerStatus;
  x: number;
  y: number;
}) => {
  return (
    <Box
      sx={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.5,
      }}
    >
      <Box
        sx={{
          width: { xs: 32, sm: 38 },
          height: { xs: 32, sm: 38 },
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: speaker.active
            ? "rgba(79, 195, 247, 0.2)"
            : "rgba(255, 255, 255, 0.04)",
          border: "1.5px solid",
          borderColor: speaker.active ? "#4fc3f7" : "rgba(255, 255, 255, 0.1)",
          transition: "all 0.3s ease",
          boxShadow: speaker.active
            ? "0 0 14px rgba(79, 195, 247, 0.45)"
            : "none",
        }}
      >
        <SpeakerIcon
          sx={{
            fontSize: { xs: 16, sm: 18 },
            color: speaker.active ? "#4fc3f7" : "rgba(255,255,255,0.28)",
          }}
        />
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontSize: "0.58rem",
          color: speaker.active ? "#4fc3f7" : "text.secondary",
          fontWeight: speaker.active ? 600 : 400,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {speaker.code}
      </Typography>
    </Box>
  );
};

const SpeakerPresetCard = ({
  speakerPreset,
  speakers,
  speakerLayout,
  layoutPending = false,
  onSelectPreset,
}: ISpeakerPresetCardProps) => {
  const { t } = useTranslation();

  const supportedSpeakers = speakers.filter((s) =>
    Boolean(SPEAKER_POSITIONS[s.code]),
  );
  const activeCount = supportedSpeakers.filter((s) => s.active).length;
  const totalCount = supportedSpeakers.length;
  const layoutLabel = speakerLayout.trim();
  const updating =
    layoutPending || (speakerPreset !== null && speakers.length === 0);

  const positionedSpeakers = [...supportedSpeakers].sort((a, b) => {
    const pa = SPEAKER_POSITIONS[a.code];
    const pb = SPEAKER_POSITIONS[b.code];
    if (pa.y !== pb.y) return pa.y - pb.y;
    return pa.x - pb.x;
  });

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent
        sx={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        {/* Title row with layout & count chips */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ color: "primary.main" }}>
            <TuneIcon sx={{ mr: 1, verticalAlign: "middle", fontSize: 22 }} />
            {t("cards.speakers.title")}
          </Typography>
          {!updating && totalCount > 0 && (
            <Box sx={{ display: "flex", gap: 1 }}>
              {layoutLabel && (
                <Chip
                  label={layoutLabel}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                />
              )}
              <Chip
                label={`${activeCount}/${totalCount}`}
                size="small"
                color="secondary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          )}
        </Box>

        {/* Preset buttons */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: { xs: 1.5, sm: 2.5 },
            mb: 2,
          }}
        >
          {PRESETS.map((preset) => {
            const active = speakerPreset === preset;

            return (
              <ButtonBase
                key={preset}
                onClick={() => onSelectPreset(preset)}
                sx={{
                  width: { xs: 88, sm: 102 },
                  height: { xs: 52, sm: 62 },
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active
                    ? "rgba(79, 195, 247, 0.2)"
                    : "rgba(255, 255, 255, 0.04)",
                  border: "1.5px solid",
                  borderColor: active ? "#4fc3f7" : "rgba(255, 255, 255, 0.1)",
                  transition: "all 0.3s ease",
                  boxShadow: active
                    ? "0 0 14px rgba(79, 195, 247, 0.45)"
                    : "none",
                  "&:hover": {
                    backgroundColor: active
                      ? "rgba(79, 195, 247, 0.3)"
                      : "rgba(255, 255, 255, 0.08)",
                    borderColor: active
                      ? "#4fc3f7"
                      : "rgba(255, 255, 255, 0.2)",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "0.78rem", sm: "0.88rem" },
                    fontWeight: active ? 700 : 500,
                    color: active ? "#4fc3f7" : "rgba(255,255,255,0.72)",
                    textAlign: "center",
                    px: 1,
                  }}
                >
                  {t("cards.speakerPreset.preset", { number: preset })}
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>

        {/* Speaker grid / updating state */}
        <Box
          sx={{
            position: "relative",
            flexGrow: 1,
            minHeight: { xs: 360, sm: 440 },
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "radial-gradient(100% 80% at 50% 50%, rgba(79,195,247,0.08) 0%, rgba(30,40,70,0.12) 45%, rgba(9,12,20,0.9) 100%)",
          }}
        >
          {updating ? (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  color: "#4fc3f7",
                  fontWeight: 700,
                  fontSize: "1rem",
                }}
              >
                {t("cards.speakerPreset.updatingConfiguration")}
              </Typography>
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  position: "absolute",
                  left: "50%",
                  top: "44%",
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.2,
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                <PersonPinCircleIcon sx={{ fontSize: 24 }} />
                <Typography
                  variant="caption"
                  sx={{ fontSize: "0.62rem", letterSpacing: 0.4 }}
                >
                  Listening Position
                </Typography>
              </Box>

              {positionedSpeakers.map((speaker) => {
                const pos = SPEAKER_POSITIONS[speaker.code];
                return (
                  <SpeakerBlock
                    key={speaker.code}
                    speaker={speaker}
                    x={pos.x}
                    y={pos.y}
                  />
                );
              })}
            </>
          )}
        </Box>

        {!updating && totalCount > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1.5, display: "block" }}
          >
            {t("cards.speakers.groups.height")} /{" "}
            {t("cards.speakers.groups.ear")} / {t("cards.speakers.groups.sub")}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default SpeakerPresetCard;
