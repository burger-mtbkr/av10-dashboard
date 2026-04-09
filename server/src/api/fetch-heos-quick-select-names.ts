import type { IHeosQuickSelectName } from './types.js';
import { getHeosPlayerId } from './get-heos-player-id.js';
import { heosCommand } from './heos-command.js';

export const fetchHeosQuickSelectNames = async (host: string): Promise<IHeosQuickSelectName[]> => {
  const playerId = await getHeosPlayerId(host);
  if (!playerId) {
    return [];
  }

  const response = (await heosCommand(
    host,
    `heos://player/get_quickselects?pid=${playerId}`,
  )) as {
    heos?: { result?: string };
    payload?: Array<{ id?: number; name?: string }>;
  } | null;

  if (response?.heos?.result !== 'success' || !Array.isArray(response.payload)) {
    return [];
  }

  return response.payload.flatMap(({ id, name }) =>
    typeof id === 'number' && typeof name === 'string' ? [{ id, name }] : [],
  );
};