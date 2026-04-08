import { postJson } from "./request";

export const setMuteRequest = (muted: boolean) => postJson("/api/mute", { muted });