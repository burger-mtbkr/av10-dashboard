import { Card, CardContent, Typography, Box, Chip } from "@mui/material";
import { useTranslation } from "react-i18next";
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import SurroundSoundIcon from "@mui/icons-material/SurroundSound";
import { PLACEHOLDER_VALUE } from "../constants";
import type { IAudioInfo } from "../types";

interface IAudioCardProps {
  audio: IAudioInfo;
  surroundMode: string;
}

const InfoRow = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 0.75,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontSize: "0.8rem" }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: highlight ? 700 : 500,
          color: highlight ? "primary.main" : "text.primary",
          fontSize: "0.8rem",
        }}
      >
        {value || PLACEHOLDER_VALUE}
      </Typography>
    </Box>
  );
};

const AudioCard = ({ audio, surroundMode }: IAudioCardProps) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ color: "primary.main", mb: 2 }}>
          <AudiotrackIcon
            sx={{ mr: 1, verticalAlign: "middle", fontSize: 22 }}
          />
          {t("cards.audio.title")}
        </Typography>

        {/* Surround mode highlight */}
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Chip
            icon={<SurroundSoundIcon />}
            label={surroundMode || PLACEHOLDER_VALUE}
            color="secondary"
            sx={{
              fontWeight: 700,
              fontSize: "0.9rem",
              px: 2,
              py: 2.5,
              height: "auto",
              "& .MuiChip-label": { px: 1 },
            }}
          />
        </Box>

        <InfoRow
          label={t("cards.audio.inputFormat")}
          value={audio.inputFormat}
          highlight
        />
        <InfoRow
          label={t("cards.audio.samplingRate")}
          value={audio.samplingRate}
        />
        <InfoRow label={t("cards.audio.dynamicEq")} value={audio.dynamicEq} />
        <InfoRow
          label={t("cards.audio.dynamicVolume")}
          value={audio.dynamicVolume}
        />
        <InfoRow label={t("cards.audio.multEq")} value={audio.multEq} />
        <InfoRow
          label={t("cards.audio.dialogEnhancer")}
          value={audio.dialogEnhancer}
        />
      </CardContent>
    </Card>
  );
};

export default AudioCard;
