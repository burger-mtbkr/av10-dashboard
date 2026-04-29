import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyEqProfileRequest,
  getEqProfilesRequest,
  saveEqProfileRequest,
} from "../api";
import type { IEqBand, IEqProfile } from "../types";

const cloneBands = (bands: IEqBand[]): IEqBand[] =>
  bands.map((band) => ({ ...band }));

export const useEqProfiles = (preset: 1 | 2 | null) => {
  const [profiles, setProfiles] = useState<IEqProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [draftBands, setDraftBands] = useState<IEqBand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );

  const loadProfiles = useCallback(async () => {
    if (!preset) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await getEqProfilesRequest(preset);
      setProfiles(response.profiles);
      const first = response.profiles[0];
      setSelectedProfileId(first?.id ?? "");
      setDraftBands(first ? cloneBands(first.bands) : []);
    } catch {
      setError("Failed to load EQ profiles");
    } finally {
      setIsLoading(false);
    }
  }, [preset]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const selectProfile = useCallback(
    (profileId: string) => {
      const profile = profiles.find((item) => item.id === profileId);
      if (!profile) return;
      setSelectedProfileId(profile.id);
      setDraftBands(cloneBands(profile.bands));
      setStatusMessage("");
      setError("");
    },
    [profiles],
  );

  const setBandGain = useCallback((frequencyHz: number, gainDb: number) => {
    setDraftBands((prev) =>
      prev.map((band) =>
        band.frequencyHz === frequencyHz
          ? { ...band, gainDb: Math.round(gainDb * 2) / 2 }
          : band,
      ),
    );
  }, []);

  const saveProfile = useCallback(
    async (name: string) => {
      if (!preset) return;
      setIsSaving(true);
      setError("");
      setStatusMessage("");
      try {
        const profile = await saveEqProfileRequest(preset, {
          profileId: selectedProfile?.readonly ? undefined : selectedProfile?.id,
          name,
          bands: draftBands,
        });
        await loadProfiles();
        setSelectedProfileId(profile.id);
        setDraftBands(cloneBands(profile.bands));
        setStatusMessage("Saved");
      } catch {
        setError("Failed to save EQ profile");
      } finally {
        setIsSaving(false);
      }
    },
    [draftBands, loadProfiles, preset, selectedProfile],
  );

  const applyProfile = useCallback(async () => {
    if (!preset || !selectedProfile) return;
    setIsApplying(true);
    setError("");
    setStatusMessage("");
    try {
      await applyEqProfileRequest(preset, selectedProfile.id);
      setStatusMessage("Applied to processor");
    } catch {
      setError("Failed to apply EQ profile");
    } finally {
      setIsApplying(false);
    }
  }, [preset, selectedProfile]);

  const hasUnsavedChanges =
    selectedProfile !== null &&
    JSON.stringify(selectedProfile.bands) !== JSON.stringify(draftBands);

  return {
    profiles,
    selectedProfile,
    draftBands,
    isLoading,
    isSaving,
    isApplying,
    error,
    statusMessage,
    hasUnsavedChanges,
    selectProfile,
    setBandGain,
    saveProfile,
    applyProfile,
  };
};
