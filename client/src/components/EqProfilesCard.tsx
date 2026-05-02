import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import GraphicEqBands from "./GraphicEqBands";
import { EQ_PROFILE_ADD_NEW_ID } from "../hooks";
import type { IEqBand, IEqProfile } from "../types";

interface IEqProfilesCardProps {
  preset: 1 | 2 | null;
  /** When false, show disabled messaging and grey bars (adjustments off for this speaker preset). */
  eqAdjustmentsDisabled: boolean;
  profiles: IEqProfile[];
  selectionId: string;
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
  eqAdjustmentsDisabled,
  profiles,
  selectionId,
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

  const showSaveRow =
    selectionId === EQ_PROFILE_ADD_NEW_ID ||
    Boolean(selectedProfile && !selectedProfile.readonly);

  useEffect(() => {
    if (selectionId === EQ_PROFILE_ADD_NEW_ID) {
      setProfileName("");
      return;
    }
    if (selectedProfile && !selectedProfile.readonly) {
      setProfileName(selectedProfile.name);
    }
  }, [selectionId, selectedProfile]);

  const applyDisabled =
    isApplying ||
    !selectedProfile ||
    selectionId === EQ_PROFILE_ADD_NEW_ID ||
    isLoading ||
    eqAdjustmentsDisabled;

  const saveDisabled =
    isSaving || !profileName.trim() || draftBands.length === 0;

  const renderSelectValue = useCallback(
    (value: unknown) => {
      if (value === EQ_PROFILE_ADD_NEW_ID) return "New profile";
      const id = typeof value === "string" ? value : "";
      const p = profiles.find((x) => x.id === id);
      if (!p) return "";
      return p.readonly ? `${p.name} (read-only)` : p.name;
    },
    [profiles],
  );

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {preset == null ? (
          <>
            <Typography variant="h6" sx={{ color: "primary.main" }}>
              <GraphicEqIcon sx={{ mr: 1, verticalAlign: "middle", fontSize: 22 }} />
              EQ Profiles
            </Typography>
            <Alert severity="info">Select speaker preset 1 or 2 on the AVR to manage EQ profiles.</Alert>
          </>
        ) : eqAdjustmentsDisabled ? (
          <>
            <Typography variant="h6" sx={{ color: "primary.main" }}>
              <GraphicEqIcon sx={{ mr: 1, verticalAlign: "middle", fontSize: 22 }} />
              EQ Profiles
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 600 }}>
              Graphic EQ is disabled for speaker preset {preset}.
            </Typography>
            <GraphicEqBands
              bands={draftBands}
              disabled={isSaving || isLoading}
              neutralFlat
              formatFrequency={formatFrequency}
              onBandChange={onBandChange}
            />
          </>
        ) : (
          <>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ rowGap: 0.5 }}>
              <Typography variant="h6" sx={{ color: "primary.main" }}>
                <GraphicEqIcon sx={{ mr: 1, verticalAlign: "middle", fontSize: 22 }} />
                EQ Profiles
              </Typography>
              <Chip
                size="small"
                label={`Speaker preset ${preset}`}
                variant="outlined"
                sx={{ borderColor: "divider", color: "text.secondary", fontWeight: 600 }}
              />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <TextField
                select
                size="small"
                label="Profile"
                value={selectionId}
                onChange={(event) => onSelectProfile(event.target.value)}
                disabled={isLoading || profiles.length === 0}
                sx={{
                  flex: "1 1 auto",
                  minWidth: 160,
                  maxWidth: 280,
                }}
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: renderSelectValue,
                  },
                }}
              >
                {profiles.map((profile) => (
                  <MenuItem key={profile.id} value={profile.id}>
                    {profile.name}
                    {profile.readonly ? " · read-only" : ""}
                  </MenuItem>
                ))}
                <MenuItem divider value={EQ_PROFILE_ADD_NEW_ID}>
                  Add new profile…
                </MenuItem>
              </TextField>
              <Button
                variant="contained"
                disabled={applyDisabled}
                onClick={() => void onApply()}
                sx={{ flexShrink: 0 }}
              >
                Apply
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Apply sends the <strong>saved</strong> profile selected above to the processor. Adjust sliders, then
              save (new or custom) before applying if you changed bands.
            </Typography>

            {showSaveRow && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <TextField
                  size="small"
                  label="Profile name"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder={
                    selectionId === EQ_PROFILE_ADD_NEW_ID ? "e.g. Movies, Music" : undefined
                  }
                  fullWidth
                />
                <Button
                  variant="outlined"
                  disabled={saveDisabled}
                  onClick={() => void onSave(profileName.trim())}
                  sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "center" } }}
                >
                  Save
                </Button>
              </Stack>
            )}

            {selectedProfile?.readonly && selectionId !== EQ_PROFILE_ADD_NEW_ID && (
              <Typography variant="caption" color="text.secondary">
                Default is read-only. Choose &quot;Add new profile…&quot; to copy your slider edits into a named
                profile, then Apply.
              </Typography>
            )}
            {hasUnsavedChanges && selectedProfile && !selectedProfile.readonly && (
              <Typography variant="caption" color="warning.main">
                Unsaved changes — click Save to update this profile before Apply.
              </Typography>
            )}

            <GraphicEqBands
              bands={draftBands}
              disabled={isSaving || isLoading}
              formatFrequency={formatFrequency}
              onBandChange={onBandChange}
            />
          </>
        )}

        {error && <Alert severity="error">{error}</Alert>}
        {statusMessage && <Alert severity="success">{statusMessage}</Alert>}
      </CardContent>
    </Card>
  );
};

export default EqProfilesCard;
