import { PLACEHOLDER_VALUE } from '../../constants.js';
import type { IVideoSignalInfo } from '../types.js';

export const parseVideoInfo = (data: unknown): IVideoSignalInfo => {
  const result: IVideoSignalInfo = {
    inputResolution: PLACEHOLDER_VALUE,
    outputResolution: PLACEHOLDER_VALUE,
    hdrFormat: PLACEHOLDER_VALUE,
    inputSignal: PLACEHOLDER_VALUE,
  };

  try {
    const response = data as { rx?: { cmd?: unknown | unknown[] } };
    const commands = Array.isArray(response?.rx?.cmd) ? response.rx.cmd : [response?.rx?.cmd];

    for (const command of commands) {
      if (!command || typeof command !== 'object') {
        continue;
      }

      const commandRecord = command as {
        name?: string;
        list?: { param?: unknown | unknown[] };
      };
      if (!commandRecord.name?.includes('GetVideoInfo')) {
        continue;
      }

      const params = Array.isArray(commandRecord.list?.param)
        ? commandRecord.list.param
        : [commandRecord.list?.param];

      for (const param of params) {
        if (!param || typeof param !== 'object') {
          continue;
        }

        const paramRecord = param as { $?: { name?: string }; _?: string };
        const value = paramRecord._ ?? (typeof param === 'string' ? param : '');
        if (paramRecord.$?.name === 'hdmisigin' && value) {
          result.inputResolution = value;
        }
        if (paramRecord.$?.name === 'hdmisigout' && value) {
          result.outputResolution = value;
        }
        if (paramRecord.$?.name === 'videooutput' && value) {
          result.inputSignal = value;
        }
      }
    }
  } catch (error) {
    console.error('[HTTP] Error parsing video info:', error);
  }

  return result;
};