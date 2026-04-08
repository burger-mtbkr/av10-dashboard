import {
  ThemeProvider,
  CssBaseline,
  Container,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useTranslation } from "react-i18next";
import theme from "./theme";
import {
  AudioCard,
  InputCard,
  SpeakerCard,
  SubwooferCard,
  SystemCard,
  VideoCard,
  VolumeCard,
} from "./components";
import { useAVRStatus } from "./hooks";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

export default function App() {
  const { t } = useTranslation();
  const {
    status,
    wsConnected,
    setVolume,
    volumeUp,
    volumeDown,
    setInput,
    toggleMute,
    selectSmartPreset,
  } = useAVRStatus();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #0a0a0f 0%, #0d0d1a 50%, #0a0a0f 100%)",
          pb: 4,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            pt: 3,
            pb: 2,
            px: 2,
            mb: 3,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background:
              "linear-gradient(180deg, rgba(79,195,247,0.03) 0%, transparent 100%)",
          }}
        >
          <Container maxWidth="lg">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  color: "primary.main",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                {t("dashboard.title")}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                {/* AVR Connection status */}
                <Chip
                  icon={
                    <FiberManualRecordIcon
                      sx={{
                        fontSize: 10,
                        color: status.connected ? "#66bb6a" : "#ef5350",
                        animation: status.connected
                          ? "none"
                          : "pulse 1.5s infinite",
                        "@keyframes pulse": {
                          "0%, 100%": { opacity: 1 },
                          "50%": { opacity: 0.3 },
                        },
                      }}
                    />
                  }
                  label={
                    status.connected ? "AVR Connected" : "AVR Disconnected"
                  }
                  variant="outlined"
                  size="small"
                  sx={{
                    borderColor: status.connected
                      ? "rgba(102,187,106,0.3)"
                      : "rgba(239,83,80,0.3)",
                    color: status.connected ? "success.main" : "error.main",
                  }}
                />
                {/* WebSocket status */}
                <Chip
                  icon={
                    <FiberManualRecordIcon
                      sx={{
                        fontSize: 10,
                        color: wsConnected ? "#4fc3f7" : "#ef5350",
                      }}
                    />
                  }
                  label={wsConnected ? "Live" : "Offline"}
                  variant="outlined"
                  size="small"
                  sx={{
                    borderColor: wsConnected
                      ? "rgba(79,195,247,0.3)"
                      : "rgba(239,83,80,0.3)",
                    color: wsConnected ? "primary.main" : "error.main",
                  }}
                />
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Dashboard Grid */}
        <Container maxWidth="lg">
          <Grid container spacing={2.5}>
            {/* Volume control — full width at the top */}
            <Grid size={{ xs: 12 }}>
              <VolumeCard
                volume={status.volume}
                volumeDisplay={status.volumeDisplay}
                maxVolume={status.maxVolume}
                muted={status.muted}
                onVolumeChange={setVolume}
                onVolumeUp={volumeUp}
                onVolumeDown={volumeDown}
                onToggleMute={toggleMute}
              />
            </Grid>

            {/* Subwoofer settings */}
            <Grid size={{ xs: 12, md: 6 }}>
              <SubwooferCard subwoofers={status.subwoofers} />
            </Grid>

            {/* Smart Select */}
            <Grid size={{ xs: 12, md: 6 }}>
              <InputCard
                smartSelect={status.smartSelect}
                currentInput={status.input}
                audio={status.audio}
                surroundMode={status.surroundMode}
                video={status.video}
                onSelectPreset={selectSmartPreset}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Grid container spacing={2.5}>
                {/* Audio signal */}
                <Grid size={{ xs: 12 }}>
                  <AudioCard
                    audio={status.audio}
                    surroundMode={status.surroundMode}
                  />
                </Grid>

                {/* Video signal */}
                <Grid size={{ xs: 12 }}>
                  <VideoCard video={status.video} />
                </Grid>
              </Grid>
            </Grid>

            {/* Speaker configuration */}
            <Grid size={{ xs: 12, md: 6 }}>
              <SpeakerCard speakers={status.speakers} />
            </Grid>

            {/* System info */}
            <Grid size={{ xs: 12 }}>
              <SystemCard
                power={status.power}
                softwareVersion={status.softwareVersion}
                networkConnection={status.networkConnection}
                ipAddress={status.ipAddress}
                lastUpdate={status.lastUpdate}
                connected={status.connected}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
