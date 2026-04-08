import { apiClient } from "./client";

export const post = (path: string) => apiClient.post(path);

export const postJson = (path: string, body: unknown) => apiClient.post(path, body);