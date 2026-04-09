import { postJson } from "./request";

export const setInputRequest = (input: string) => postJson("/api/input", { input });