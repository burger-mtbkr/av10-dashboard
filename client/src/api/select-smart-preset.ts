import { post } from "./request";

export const selectSmartPresetRequest = (preset: number) => post(`/api/smartselect/${preset}`);