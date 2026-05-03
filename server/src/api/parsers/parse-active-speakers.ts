import { CHANNEL_MAP } from '../../core/constants.js';
import type { ISpeakerStatus } from '../../types/core.js';

export const parseActiveSpeakers = (data: unknown): ISpeakerStatus[] => {
  const speakers: ISpeakerStatus[] = [];
  const seen = new Set<string>();

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
      if (!commandRecord.name?.includes('GetActiveSpeaker')) {
        continue;
      }

      const params = Array.isArray(commandRecord.list?.param)
        ? commandRecord.list.param
        : [commandRecord.list?.param];

      for (const param of params) {
        if (!param || typeof param !== 'object') {
          continue;
        }

        const paramRecord = param as Record<string, unknown> & { $?: { name?: string } };
        if (paramRecord.$?.name !== 'activespall') {
          continue;
        }

        for (const [key, value] of Object.entries(paramRecord)) {
          if (key === '$' || key === '_') {
            continue;
          }

          const code = key.toUpperCase();
          if (!(code in CHANNEL_MAP) || seen.has(code)) {
            continue;
          }

          const level = parseInt(String(value), 10);
          if (Number.isNaN(level) || level <= 0) {
            continue;
          }

          seen.add(code);
          speakers.push({
            code,
            name: CHANNEL_MAP[code].name,
            active: level >= 2,
            group: CHANNEL_MAP[code].group,
          });
        }
      }

      if (speakers.length > 0) {
        break;
      }

      for (const param of params) {
        if (!param || typeof param !== 'object') {
          continue;
        }

        const paramRecord = param as { $?: { name?: string }; _?: string };
        const code = (paramRecord.$?.name ?? '').toUpperCase();
        if (!(code in CHANNEL_MAP) || seen.has(code)) {
          continue;
        }

        const level = parseInt(paramRecord._ ?? String(param), 10);
        if (Number.isNaN(level) || level <= 0) {
          continue;
        }

        seen.add(code);
        speakers.push({
          code,
          name: CHANNEL_MAP[code].name,
          active: level >= 2,
          group: CHANNEL_MAP[code].group,
        });
      }

      if (speakers.length > 0) {
        break;
      }

      for (const param of params) {
        if (!param) {
          continue;
        }

        const paramRecord = typeof param === 'object' ? (param as { $?: { name?: string }; _?: string }) : {};
        const paramName = paramRecord.$?.name ?? '';
        const text = paramRecord._ ?? (typeof param === 'string' ? param : '');
        if (!text || (!paramName.toLowerCase().includes('active') && !paramName.toLowerCase().includes('speaker'))) {
          continue;
        }

        for (const token of text.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean)) {
          if (!(token in CHANNEL_MAP) || seen.has(token)) {
            continue;
          }

          seen.add(token);
          speakers.push({
            code: token,
            name: CHANNEL_MAP[token].name,
            active: true,
            group: CHANNEL_MAP[token].group,
          });
        }
      }

      if (speakers.length > 0) {
        break;
      }
    }
  } catch (error) {
    console.error('[HTTP] Error parsing active speakers:', error);
  }

  return speakers.sort((left, right) => left.code.localeCompare(right.code));
};