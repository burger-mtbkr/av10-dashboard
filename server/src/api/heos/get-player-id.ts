import { heosCommand } from './command.js';

export const getHeosPlayerId = async (host: string): Promise<number | null> => {
  const response = (await heosCommand(host, 'heos://player/get_players')) as {
    heos?: { result?: string };
    payload?: Array<{ ip?: string; pid?: number }>;
  } | null;

  if (response?.heos?.result !== 'success' || !Array.isArray(response.payload)) {
    return null;
  }

  const player = response.payload.find(({ ip }) => ip === host) ?? response.payload[0];
  return player?.pid ?? null;
};
