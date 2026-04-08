import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import type { SubwooferInfo } from "../types";

interface SubwooferCardProps {
  subwoofers: SubwooferInfo[];
}

export default function SubwooferCard({ subwoofers }: SubwooferCardProps) {
  const { t } = useTranslation();

  /** Parse dB level string to number for the progress bar */
  const parseLevelToPercent = (level: string): number => {
    const match = level.match(/([-+]?\d+\.?\d*)/);
    if (!match) return 50;
    const db = parseFloat(match[1]);
    // -12 to +12 range → 0-100%
    return Math.max(0, Math.min(100, ((db + 12) / 24) * 100));
  };

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ height: "100%" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ color: "primary.main" }}>
            <GraphicEqIcon
              sx={{ mr: 1, verticalAlign: "middle", fontSize: 22 }}
            />
            {t("cards.subwoofer.title")}
          </Typography>
        </Box>

        {subwoofers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No subwoofer data available
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {subwoofers.map((sub) => (
              <Box key={sub.number}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 0.5,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {t("cards.subwoofer.sub", { number: sub.number })}
                  </Typography>
                  <Chip
                    label={sub.level}
                    size="small"
                    color={sub.active ? "secondary" : "default"}
                    variant={sub.active ? "filled" : "outlined"}
                    sx={{
                      fontWeight: 600,
                      minWidth: 80,
                      justifyContent: "center",
                    }}
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={parseLevelToPercent(sub.level)}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 3,
                      background: sub.active
                        ? "linear-gradient(90deg, #66bb6a 0%, #4fc3f7 100%)"
                        : "rgba(255,255,255,0.15)",
                    },
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
