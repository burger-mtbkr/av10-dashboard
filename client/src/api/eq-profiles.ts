import { apiClient } from "./client";
import type { IEqBand, IEqProfile, IEqProfilesResponse } from "../types";

export interface IEqProcessorBandsResponse {
  bandFrequenciesHz: number[];
  bands: IEqBand[];
}

export const getEqFromProcessorRequest = async (
  preset: 1 | 2,
): Promise<IEqProcessorBandsResponse> => {
  const response = await apiClient.get<IEqProcessorBandsResponse>(
    `/api/eq/presets/${preset}/processor`,
  );
  return response.data;
};

export const getEqProfilesRequest = async (
  preset: 1 | 2,
): Promise<IEqProfilesResponse> => {
  const response = await apiClient.get<IEqProfilesResponse>(
    `/api/eq/presets/${preset}/profiles`,
  );
  return response.data;
};

export const saveEqProfileRequest = async (
  preset: 1 | 2,
  payload: { profileId?: string; name: string; bands: IEqBand[] },
): Promise<IEqProfile> => {
  const response = await apiClient.post<{ success: boolean; profile: IEqProfile }>(
    `/api/eq/presets/${preset}/profiles`,
    payload,
  );
  return response.data.profile;
};

export const applyEqProfileRequest = async (
  preset: 1 | 2,
  profileId: string,
): Promise<void> => {
  await apiClient.post(`/api/eq/presets/${preset}/profiles/${profileId}/apply`);
};
