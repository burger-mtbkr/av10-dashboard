import { Card, CardContent, Typography, Box, Chip } from "@mui/material";
import { useTranslation } from "react-i18next";
import SpeakerIcon from "@mui/icons-material/Speaker";
import PersonPinCircleIcon from "@mui/icons-material/PersonPinCircle";
import type { SpeakerStatus } from "../types";

interface SpeakerCardProps {
  speakers: SpeakerStatus[];
}

/**
 * Grid-style layout: speakers are placed in strict horizontal rows.
 * Screen / front wall at the top, listening position in the centre,
 * surround-backs at the bottom. Height channels share the same row as
 * their ear-level counterparts but sit OUTSIDE (wider x) them.
 */
const SPEAKER_POSITIONS: Record<string, { x: number; y: number }> = {
  // 6 main rows at 18% intervals: 8, 26, 44, 62, 80, 92
  // Columns: FWL=3  FL/FHL/SL/RHL=18  SBL/TFL=35  C=50  SBR/TFR=65  FR/FHR/SR/RHR=82  FWR=97

  // ── Row 1 (y 8%) ── Front wall: fronts + centre + subs
  FWL: { x: 3, y: 8 },
  FL: { x: 18, y: 8 },
  SW3: { x: 32, y: 8 },
  SW: { x: 40, y: 8 },
  C: { x: 50, y: 8 },
  SW2: { x: 60, y: 8 },
  SW4: { x: 68, y: 8 },
  FR: { x: 82, y: 8 },
  FWR: { x: 97, y: 8 },

  // ── Row 2 (y 26%) ── Front heights
  FHL: { x: 18, y: 26 },
  TFL: { x: 35, y: 26 },
  FDL: { x: 35, y: 26 },
  TFR: { x: 65, y: 26 },
  FDR: { x: 65, y: 26 },
  FHR: { x: 82, y: 26 },

  // ── (y 35%) ── Dolby / middle heights (between rows 2 and 3)
  SDL: { x: 18, y: 35 },
  TML: { x: 35, y: 35 },
  CH: { x: 50, y: 35 },
  TS: { x: 50, y: 35 },
  TMR: { x: 65, y: 35 },
  SDR: { x: 82, y: 35 },

  // ── Row 3 (y 44%) ── Side surrounds + listening position
  SL: { x: 18, y: 44 },
  SR: { x: 82, y: 44 },

  // ── Row 4 (y 62%) ── Rear heights
  SHL: { x: 18, y: 62 },
  RHL: { x: 18, y: 62 },
  SHR: { x: 82, y: 62 },
  RHR: { x: 82, y: 62 },

  // ── Row 5 (y 80%) ── Surround backs
  SBL: { x: 35, y: 80 },
  TRL: { x: 35, y: 80 },
  BDL: { x: 35, y: 80 },
  TRR: { x: 65, y: 80 },
  BDR: { x: 65, y: 80 },
  SBR: { x: 65, y: 80 },

  // ── Row 6 (y 92%) ── Centre back
  SB: { x: 50, y: 92 },
};

function SpeakerBlock({
  speaker,
  x,
  y,
}: {
  speaker: SpeakerStatus;
  x: number;
  y: number;
}) {
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
}

export default function SpeakerCard({ speakers }: SpeakerCardProps) {
  const { t } = useTranslation();

  if (!speakers.length) {
    return (
      <Card sx={{ height: "100%" }}>
        <CardContent
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: "primary.main" }}>
            <SpeakerIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            {t("cards.speakers.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No speaker data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const supportedSpeakers = speakers.filter((s) =>
    Boolean(SPEAKER_POSITIONS[s.code]),
  );

  const activeCount = supportedSpeakers.filter((s) => s.active).length;
  const totalCount = supportedSpeakers.length;

  // Compute layout label like "7.2.4" from ACTIVE speakers only
  const activeSpeakers = supportedSpeakers.filter((s) => s.active);
  const earCount = activeSpeakers.filter(
    (s) => s.group === "ear" || s.group === "wide" || s.group === "back",
  ).length;
  const subCount = activeSpeakers.filter((s) => s.group === "sub").length;
  const heightCount = activeSpeakers.filter((s) => s.group === "height").length;
  const layoutLabel =
    heightCount > 0
      ? `${earCount}.${subCount}.${heightCount}`
      : `${earCount}.${subCount}`;

  const positionedSpeakers = [...supportedSpeakers].sort((a, b) => {
    const pa = SPEAKER_POSITIONS[a.code];
    const pb = SPEAKER_POSITIONS[b.code];
    if (pa.y !== pb.y) return pa.y - pb.y;
    return pa.x - pb.x;
  });

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ color: "primary.main" }}>
            <SpeakerIcon
              sx={{ mr: 1, verticalAlign: "middle", fontSize: 22 }}
            />
            {t("cards.speakers.title")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Chip
              label={layoutLabel}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: "0.8rem" }}
            />
            <Chip
              label={`${activeCount}/${totalCount}`}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </Box>
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
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1.5, display: "block" }}
        >
          {t("cards.speakers.groups.height")} / {t("cards.speakers.groups.ear")}{" "}
          / {t("cards.speakers.groups.sub")}
        </Typography>
      </CardContent>
    </Card>
  );
}
