import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyEqProfileRequest,
  getEqFromProcessorRequest,
  getEqProfilesRequest,
  saveEqProfileRequest,
} from "../api";
import { clampEqGainDb } from "../eqGainRange";
import type {
  IEqBand,
  IEqProfile,
  IEqProfilesResponse,
  IGraphicEqStatus,
} from "../types";

const cloneBands = (bands: IEqBand[]): IEqBand[] =>
  bands.map((band) => ({ ...band }));

/** Dropdown sentinel: create a new custom profile from current band sliders. */
export const EQ_PROFILE_ADD_NEW_ID = "__eq_add_new__";

/** AVR / WS payloads sometimes send speaker preset as string — normalize for EQ API routes. */
const normalizeSpeakerPreset = (raw: unknown): 1 | 2 | null => {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return null;
};

export const useEqProfiles = (
  preset: 1 | 2 | null,
  liveGraphicEq?: IGraphicEqStatus | null,
  _statusLastUpdate?: string,
) => {
  const activePreset = normalizeSpeakerPreset(preset);
  const loadSeq = useRef(0);
  const profilesHydrated = useRef(false);
  const hasUnsavedRef = useRef(false);
  const applyInFlightRef = useRef(false);

  const [profiles, setProfiles] = useState<IEqProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [draftBands, setDraftBands] = useState<IEqBand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [graphicEqAdjustmentsEnabled, setGraphicEqAdjustmentsEnabled] = useState(true);

  /** Stored selection, or “Add new”, or first profile when invalid. */
  const selectionId = useMemo(() => {
    if (selectedProfileId === EQ_PROFILE_ADD_NEW_ID) return EQ_PROFILE_ADD_NEW_ID;
    if (profiles.length === 0) return "";
    if (profiles.some((p) => p.id === selectedProfileId)) return selectedProfileId;
    return profiles[0]?.id ?? "";
  }, [profiles, selectedProfileId]);

  const selectedProfile = useMemo(
    () =>
      selectionId === EQ_PROFILE_ADD_NEW_ID
        ? null
        : (profiles.find((profile) => profile.id === selectionId) ?? null),
    [profiles, selectionId],
  );

  /** If the current selection no longer exists (e.g. profile removed), fall back to the first profile. */
  useEffect(() => {
    if (profiles.length === 0) return;
    if (selectedProfileId === EQ_PROFILE_ADD_NEW_ID) return;
    if (profiles.some((p) => p.id === selectedProfileId)) return;
    const first = profiles[0];
    setSelectedProfileId(first.id);
    setDraftBands(cloneBands(first.bands));
  }, [profiles, selectedProfileId]);

  const loadProfiles = useCallback(async () => {
    if (!activePreset) {
      profilesHydrated.current = false;
      setProfiles([]);
      setSelectedProfileId("");
      setDraftBands([]);
      setGraphicEqAdjustmentsEnabled(true);
      return;
    }
    const seq = ++loadSeq.current;
    setIsLoading(true);
    setError("");
    try {
      const response = await getEqProfilesRequest(activePreset);
      if (seq !== loadSeq.current) return;
      setProfiles(response.profiles);
      const raw = response as IEqProfilesResponse & {
        graphicEqAdjustmentsEnabled?: boolean;
      };
      const adjEnabled = raw.graphicEqAdjustmentsEnabled;
      setGraphicEqAdjustmentsEnabled(adjEnabled !== false);
      const first = response.profiles[0];
      setSelectedProfileId(first?.id ?? "");
      setDraftBands(first ? cloneBands(first.bands) : []);
    } catch {
      if (seq === loadSeq.current) setError("Failed to load EQ profiles");
    } finally {
      if (seq === loadSeq.current) {
        setIsLoading(false);
        profilesHydrated.current = true;
      }
    }
  }, [activePreset]);

  useEffect(() => {
    profilesHydrated.current = false;
    void loadProfiles();
  }, [loadProfiles]);

  /** Live telnet / WS graphic EQ snapshot — updates sliders when not edited locally. */
  useEffect(() => {
    if (!activePreset || !profilesHydrated.current) return;
    if (hasUnsavedRef.current) return;
    const bands = liveGraphicEq?.bands;
    if (!bands?.length) return;
    setDraftBands(cloneBands(bands));
  }, [activePreset, liveGraphicEq?.updatedAt]);

  const selectProfile = useCallback(
    (profileId: string) => {
      if (profileId === EQ_PROFILE_ADD_NEW_ID) {
        setSelectedProfileId(EQ_PROFILE_ADD_NEW_ID);
        setStatusMessage("");
        setError("");
        return;
      }
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
    const g = clampEqGainDb(gainDb);
    setDraftBands((prev) =>
      prev.map((band) =>
        band.frequencyHz === frequencyHz ? { ...band, gainDb: g } : band,
      ),
    );
  }, []);

  const saveProfile = useCallback(
    async (name: string) => {
      if (!activePreset) return;
      const trimmed = name.trim();
      if (!trimmed) return;

      const isAddNew = selectedProfileId === EQ_PROFILE_ADD_NEW_ID;
      const existingCustom =
        selectedProfile && !selectedProfile.readonly && !isAddNew ? selectedProfile : null;

      setIsSaving(true);
      setError("");
      setStatusMessage("");
      try {
        const profile = await saveEqProfileRequest(activePreset, {
          profileId: existingCustom ? existingCustom.id : undefined,
          name: trimmed,
          bands: draftBands,
        });
        await loadProfiles();
        setSelectedProfileId(profile.id);
        setDraftBands(cloneBands(profile.bands));
        setStatusMessage(
          isAddNew
            ? "Profile saved — click Apply to send it to the processor."
            : "Saved",
        );
      } catch {
        setError("Failed to save EQ profile");
      } finally {
        setIsSaving(false);
      }
    },
    [draftBands, loadProfiles, activePreset, selectedProfile, selectedProfileId],
  );

  const applyProfile = useCallback(async () => {
    if (!activePreset || !selectedProfile || selectedProfileId === EQ_PROFILE_ADD_NEW_ID) return;
    if (applyInFlightRef.current) return;
    applyInFlightRef.current = true;
    setIsApplying(true);
    setError("");
    setStatusMessage("");
    try {
      await applyEqProfileRequest(activePreset, selectedProfile.id);
      setDraftBands(cloneBands(selectedProfile.bands));
      setStatusMessage("Applied to processor");
    } catch {
      setError("Failed to apply EQ profile");
    } finally {
      applyInFlightRef.current = false;
      setIsApplying(false);
    }
  }, [activePreset, selectedProfile, selectedProfileId]);

  const syncFromProcessor = useCallback(async () => {
    if (!activePreset) return;
    setIsSyncing(true);
    setError("");
    setStatusMessage("");
    try {
      const { bands } = await getEqFromProcessorRequest(activePreset);
      setDraftBands(cloneBands(bands));
      setStatusMessage("Loaded EQ from processor");
    } catch {
      setError("Failed to read EQ from processor");
    } finally {
      setIsSyncing(false);
    }
  }, [activePreset]);

  const hasUnsavedChanges =
    selectedProfile !== null &&
    selectedProfileId !== EQ_PROFILE_ADD_NEW_ID &&
    JSON.stringify(selectedProfile.bands) !== JSON.stringify(draftBands);

  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  return {
    /** Normalized 1 | 2 | null — use for EQ card visibility (handles string preset from AVR). */
    presetForEq: activePreset,
    graphicEqAdjustmentsEnabled,
    profiles,
    selectionId,
    selectedProfile,
    draftBands,
    isLoading,
    isSaving,
    isApplying,
    isSyncing,
    error,
    statusMessage,
    hasUnsavedChanges,
    selectProfile,
    setBandGain,
    saveProfile,
    applyProfile,
    syncFromProcessor,
  };
};
