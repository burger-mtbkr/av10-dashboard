import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import type { IEqBand, IEqProfile } from "../types";

interface IEqProfilesCardProps {
  preset: 1 | 2 | null;
  profiles: IEqProfile[];
  selectedProfile: IEqProfile | null;
  draftBands: IEqBand[];
  isLoading: boolean;
  isSaving: boolean;
  isApplying: boolean;
  hasUnsavedChanges: boolean;
  error: string;
  statusMessage: string;
  onSelectProfile: (profileId: string) => void;
  onBandChange: (frequencyHz: number, gainDb: number) => void;
  onSave: (name: string) => Promise<void>;
  onApply: () => Promise<void>;
}

const formatFrequency = (frequencyHz: number): string =>
  frequencyHz >= 1000 ? `${frequencyHz / 1000}kHz` : `${frequencyHz}Hz`;

const EqProfilesCard = ({
  preset,
  profiles,
  selectedProfile,
  draftBands,
  isLoading,
  isSaving,
  isApplying,
  hasUnsavedChanges,
  error,
  statusMessage,
  onSelectProfile,
  onBandChange,
  onSave,
  onApply,
}: IEqProfilesCardProps) => {
  const [profileName, setProfileName] = useState("");

  const saveLabel = useMemo(() => {
    if (!selectedProfile) return "Save";
    return selectedProfile.readonly ? "Save As" : "Save";
  }, [selectedProfile]);

  const canEdit = !selectedProfile?.readonly;

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h6" sx={{ color: "primary.main" }}>
          <GraphicEqIcon sx={{ mr: 1, verticalAlign: "middle", fontSize: 22 }} />
          EQ Profiles
        </Typography>

        {preset === null ? (
          <Alert severity="info">Select speaker preset 1 or 2 to manage EQ profiles.</Alert>
        ) : (
          <>
            <TextField
              select
              size="small"
              label="Profile"
              value={selectedProfile?.id ?? ""}
              onChange={(event) => onSelectProfile(event.target.value)}
              disabled={isLoading || profiles.length === 0}
            >
              {profiles.map((profile) => (
                <MenuItem key={profile.id} value={profile.id}>
                  {profile.name}
                  {profile.readonly ? " (default)" : ""}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ display: "grid", gap: 1 }}>
              {draftBands.map((band) => (
                <Box key={band.frequencyHz}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="caption">{formatFrequency(band.frequencyHz)}</Typography>
                    <Typography variant="caption">{band.gainDb.toFixed(1)} dB</Typography>
                  </Box>
                  <Slider
                    value={band.gainDb}
                    min={-12}
                    max={12}
                    step={0.5}
                    onChange={(_, value) =>
                      onBandChange(
                        band.frequencyHz,
                        Array.isArray(value) ? value[0] : value,
                      )
                    }
                    disabled={!canEdit || isSaving}
                  />
                </Box>
              ))}
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                size="small"
                label="Profile name"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder={selectedProfile?.name ?? "Movie Night"}
                fullWidth
              />
              <Button
                variant="contained"
                disabled={isSaving || !profileName.trim()}
                onClick={() => onSave(profileName.trim())}
              >
                {saveLabel}
              </Button>
              <Button
                variant="outlined"
                disabled={isApplying || !selectedProfile}
                onClick={() => void onApply()}
              >
                Apply
              </Button>
            </Stack>

            {selectedProfile?.readonly && (
              <Typography variant="caption" color="text.secondary">
                Default profiles are read-only. Use Save As with a new profile name to create an editable copy.
              </Typography>
            )}
            {hasUnsavedChanges && canEdit && (
              <Typography variant="caption" color="warning.main">
                You have unsaved changes.
              </Typography>
            )}
          </>
        )}

        {error && <Alert severity="error">{error}</Alert>}
        {statusMessage && <Alert severity="success">{statusMessage}</Alert>}
      </CardContent>
    </Card>
  );
};

export default EqProfilesCard;
