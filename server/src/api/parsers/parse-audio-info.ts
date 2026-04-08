import type { IAudioSignalInfo } from '../types.js';

export const parseAudioInfo = (data: unknown): IAudioSignalInfo => {
  const result: IAudioSignalInfo = {
    inputFormat: '---',
    soundMode: '---',
    samplingRate: '---',
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
      if (!commandRecord.name?.includes('GetAudioInfo')) {
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
        if (paramRecord.$?.name === 'signal' && value) {
          result.inputFormat = value;
        }
        if (paramRecord.$?.name === 'sound' && value) {
          result.soundMode = value;
        }
        if (paramRecord.$?.name === 'fs' && value) {
          result.samplingRate = value;
        }
      }
    }
  } catch (error) {
    console.error('[HTTP] Error parsing audio info:', error);
  }

  return result;
};