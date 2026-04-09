import { Card, CardContent, Typography, Box, ButtonBase } from "@mui/material";
import { useTranslation } from "react-i18next";
import TuneIcon from "@mui/icons-material/Tune";

interface ISpeakerPresetCardProps {
  speakerPreset: 1 | 2 | null;
  layoutLabel: string;
  layoutPending?: boolean;
  onSelectPreset: (preset: 1 | 2) => void;
}

const PRESETS = [1, 2] as const;

const SpeakerPresetCard = ({
  speakerPreset,
  layoutLabel,
  layoutPending = false,
  onSelectPreset,
}: ISpeakerPresetCardProps) => {
  const { t } = useTranslation();

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ height: "100%" }}>
        <Typography variant="h6" sx={{ color: "primary.main", mb: 2 }}>
          <TuneIcon sx={{ mr: 1, verticalAlign: "middle", fontSize: 22 }} />
          {t("cards.speakerPreset.title")}
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: { xs: 1.5, sm: 2.5 },
            mb: speakerPreset && layoutLabel ? 2 : 0,
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

        {speakerPreset && (layoutLabel || layoutPending) && (
          <Box
            sx={{
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
              {t("cards.speakerPreset.selectedConfiguration")}
            </Typography>
            <Typography
              sx={{
                color: "#4fc3f7",
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            >
              {layoutPending
                ? t("cards.speakerPreset.updatingConfiguration")
                : layoutLabel}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SpeakerPresetCard;
