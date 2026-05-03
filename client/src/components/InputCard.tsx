import { Card, CardContent, Typography, Box, ButtonBase } from "@mui/material";
import { useTranslation } from "react-i18next";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import {
  PLACEHOLDER_VALUE,
  type IAudioInfo,
  type IInputSource,
  type ISmartSelectPreset,
  type IVideoInfo,
} from "../types";

interface IInputCardProps {
  smartSelect: ISmartSelectPreset[];
  currentInput: IInputSource;
  audio: IAudioInfo;
  surroundMode: string;
  video: IVideoInfo;
  onSelectPreset: (preset: number) => void;
}

const InputCard = ({
  smartSelect,
  currentInput,
  audio,
  surroundMode,
  video,
  onSelectPreset,
}: IInputCardProps) => {
  const { t } = useTranslation();

  const activePreset = smartSelect.find((p) => p.active);

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ height: "100%" }}>
        <Typography variant="h6" sx={{ color: "primary.main", mb: 2 }}>
          <TouchAppIcon sx={{ mr: 1, verticalAlign: "middle", fontSize: 22 }} />
          {t("cards.input.title")}
        </Typography>

        {/* Smart Select preset buttons */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: { xs: 1.5, sm: 2.5 },
            mb: 2,
          }}
        >
          {smartSelect.map((preset) => (
            <Box
              key={preset.number}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <ButtonBase
                onClick={() => onSelectPreset(preset.number)}
                sx={{
                  width: { xs: 52, sm: 62 },
                  height: { xs: 52, sm: 62 },
                  borderRadius: "50%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: preset.active
                    ? "rgba(79, 195, 247, 0.2)"
                    : "rgba(255, 255, 255, 0.04)",
                  border: "1.5px solid",
                  borderColor: preset.active
                    ? "#4fc3f7"
                    : "rgba(255, 255, 255, 0.1)",
                  transition: "all 0.3s ease",
                  boxShadow: preset.active
                    ? "0 0 14px rgba(79, 195, 247, 0.45)"
                    : "none",
                  "&:hover": {
                    backgroundColor: preset.active
                      ? "rgba(79, 195, 247, 0.3)"
                      : "rgba(255, 255, 255, 0.08)",
                    borderColor: preset.active
                      ? "#4fc3f7"
                      : "rgba(255, 255, 255, 0.2)",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "0.65rem", sm: "0.72rem" },
                    fontWeight: preset.active ? 700 : 500,
                    color: preset.active ? "#4fc3f7" : "rgba(255,255,255,0.5)",
                    lineHeight: 1.2,
                    textAlign: "center",
                    px: 0.3,
                  }}
                >
                  {preset.name}
                </Typography>
              </ButtonBase>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.58rem",
                  color: preset.active ? "#4fc3f7" : "text.secondary",
                  fontWeight: preset.active ? 600 : 400,
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {preset.number}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Selected preset metadata */}
        {activePreset && (
          <Box
            sx={{
              mt: 1,
              p: 1.5,
              borderRadius: 1,
              backgroundColor: "rgba(79, 195, 247, 0.06)",
              border: "1px solid rgba(79, 195, 247, 0.15)",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", display: "block", mb: 0.5 }}
            >
              {t("cards.input.activePreset")}
            </Typography>
            <Typography
              sx={{
                color: "#4fc3f7",
                fontWeight: 700,
                fontSize: "0.95rem",
                mb: 1,
              }}
            >
              {activePreset.name}
            </Typography>

            {/* Metadata grid */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 0.8,
              }}
            >
              <MetadataItem
                label={t("cards.input.currentSource")}
                value={
                  currentInput.name || currentInput.id || PLACEHOLDER_VALUE
                }
              />
              <MetadataItem
                label={t("cards.input.soundMode")}
                value={surroundMode || audio.soundMode || PLACEHOLDER_VALUE}
              />
              <MetadataItem
                label={t("cards.input.inputFormat")}
                value={audio.inputFormat || PLACEHOLDER_VALUE}
              />
              <MetadataItem
                label={t("cards.input.samplingRate")}
                value={audio.samplingRate || PLACEHOLDER_VALUE}
              />
              <MetadataItem
                label={t("cards.input.inputResolution")}
                value={video.inputResolution || PLACEHOLDER_VALUE}
              />
              <MetadataItem
                label={t("cards.input.hdrFormat")}
                value={video.hdrFormat || PLACEHOLDER_VALUE}
              />
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const MetadataItem = ({ label, value }: { label: string; value: string }) => {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontSize: "0.6rem",
          display: "block",
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          color: "rgba(255,255,255,0.85)",
          fontSize: "0.78rem",
          fontWeight: 500,
          lineHeight: 1.3,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

export default InputCard;
