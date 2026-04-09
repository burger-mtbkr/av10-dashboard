import { SMART_SELECT_DEFAULTS, SMART_SELECT_SLOTS } from '../../constants.js';
import type { ISmartSelectPreset } from '../../types.js';

export const parseSmartSelectNames = (data: unknown): ISmartSelectPreset[] => {
  const presets: ISmartSelectPreset[] = SMART_SELECT_SLOTS.map((slot) => ({
    number: slot,
    name: SMART_SELECT_DEFAULTS[slot],
    active: false,
  }));

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
      const commandName = commandRecord.name ?? '';
      if (
        !commandName.includes('QuickSelect')
        && !commandName.includes('Quickselect')
        && !commandName.includes('SmartSelect')
        && !commandName.includes('Smartselect')
      ) {
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
        const match = paramRecord.$?.name?.match(/(\d)/);
        if (!match) {
          continue;
        }

        const presetNumber = parseInt(match[1], 10);
        const preset = presets.find(({ number }) => number === presetNumber);
        if (preset && paramRecord._?.trim()) {
          preset.name = paramRecord._.trim();
        }
      }
    }
  } catch (error) {
    console.error('[HTTP] Error parsing smart select names:', error);
  }

  return presets;
};