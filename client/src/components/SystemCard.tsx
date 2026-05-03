import { Card, CardContent, Typography, Box, Chip } from "@mui/material";
import { useTranslation } from "react-i18next";
import InfoIcon from "@mui/icons-material/Info";
import MemoryIcon from "@mui/icons-material/Memory";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import WifiIcon from "@mui/icons-material/Wifi";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import DnsIcon from "@mui/icons-material/Dns";
import { PLACEHOLDER_VALUE } from "../types";

interface ISystemCardProps {
  power: "ON" | "OFF" | "STANDBY";
  processorModel?: string;
  softwareVersion?: string;
  networkConnection?: string;
  ipAddress?: string;
  lastUpdate: string;
  connected: boolean;
}

const SystemCard = ({
  power,
  processorModel,
  softwareVersion,
  networkConnection,
  ipAddress,
  lastUpdate,
  connected,
}: ISystemCardProps) => {
  const { t } = useTranslation();

  const formatTime = (iso: string): string => {
    if (!iso) return PLACEHOLDER_VALUE;
    try {
      return new Date(iso).toLocaleTimeString();
    } catch {
      return iso;
    }
  };

  const formatValue = (value?: string): string => {
    if (!value || !value.trim()) {
      return PLACEHOLDER_VALUE;
    }
    return value;
  };

  const networkLabel = formatValue(networkConnection);
  const NetworkIcon =
    networkLabel === "Wi-Fi" ? WifiIcon : SettingsEthernetIcon;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ color: "primary.main", mb: 2 }}>
          <InfoIcon sx={{ mr: 1, verticalAlign: "middle", fontSize: 22 }} />
          {t("cards.system.title")}
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {/* Power */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PowerSettingsNewIcon
                sx={{ fontSize: 18, color: "text.secondary" }}
              />
              <Typography variant="body2" color="text.secondary">
                {t("cards.system.power")}
              </Typography>
            </Box>
            <Chip
              label={power}
              size="small"
              color={
                power === "ON"
                  ? "success"
                  : power === "STANDBY"
                    ? "warning"
                    : "default"
              }
              sx={{ fontWeight: 600 }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <MemoryIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {t("cards.system.model")}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, textAlign: "right" }}
            >
              {formatValue(processorModel)}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SettingsSuggestIcon
                sx={{ fontSize: 18, color: "text.secondary" }}
              />
              <Typography variant="body2" color="text.secondary">
                {t("cards.system.softwareVersion")}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, textAlign: "right" }}
            >
              {formatValue(softwareVersion)}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <NetworkIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {t("cards.system.networkConnection")}
              </Typography>
            </Box>
            <Chip
              label={networkLabel}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <DnsIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {t("cards.system.ipAddress")}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, fontFamily: "monospace" }}
            >
              {formatValue(ipAddress)}
            </Typography>
          </Box>

          {/* Last Update */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AccessTimeIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {t("cards.system.lastUpdate")}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}
            >
              {formatTime(lastUpdate)}
            </Typography>
          </Box>

          {/* Connection indicator */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
            <Chip
              label={
                connected
                  ? t("dashboard.connectionStatus.connected")
                  : t("dashboard.connectionStatus.disconnected")
              }
              size="small"
              color={connected ? "success" : "error"}
              variant="outlined"
              sx={{
                fontWeight: 600,
                "& .MuiChip-label": { px: 2 },
              }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SystemCard;
