import { postJson } from "./request";

export const setVolumeRequest = (volume: number) => postJson("/api/volume", { volume });
