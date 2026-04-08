import type { INetworkInfo } from '../types.js';

const NETWORK_CONNECTION_MAP: Record<string, string> = {
  '3': 'Ethernet',
  '4': 'Wi-Fi',
};

export const parseNetworkInfo = (data: unknown): INetworkInfo => {
  const info = (data as {
    Information?: {
      Connection?: string | { _?: string };
      IPAddress?: string;
    };
  })?.Information;
  const connectionCode = typeof info?.Connection === 'string'
    ? info.Connection.trim()
    : typeof info?.Connection?._ === 'string'
      ? info.Connection._.trim()
      : '';
  const ipAddress = typeof info?.IPAddress === 'string' && info.IPAddress.trim()
    ? info.IPAddress.trim()
    : '---';

  return {
    networkConnection: NETWORK_CONNECTION_MAP[connectionCode] || '---',
    ipAddress,
  };
};