import { post } from "./request";

export const selectSpeakerPresetRequest = (preset: 1 | 2) => post(`/api/speakerpreset/${preset}`);
