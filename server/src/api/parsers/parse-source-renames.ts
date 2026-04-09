export const parseSourceRenames = (data: unknown): Record<string, string> => {
  const renames: Record<string, string> = {};

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
      if (!commandRecord.name?.includes('GetSourceRename')) {
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
        if (paramRecord.$?.name && paramRecord._) {
          renames[paramRecord.$.name] = paramRecord._;
        }
      }
    }
  } catch (error) {
    console.error('[HTTP] Error parsing source renames:', error);
  }

  return renames;
};