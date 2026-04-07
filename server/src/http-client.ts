import http from 'http';
import { parseStringPromise } from 'xml2js';
import { CHANNEL_MAP, SOURCE_MAP, parseVolume } from './constants.js';
import type { SpeakerStatus, InputSource, SubwooferInfo } from './types.js';

/** Make an HTTP request and return the response body */
function httpGet(host: string, port: number, path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port, path, method: 'GET', timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('HTTP request timeout'));
    });
    req.end();
  });
}

/** POST XML to the AppCommand endpoint */
function httpPostXml(host: string, port: number, path: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 5000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('HTTP request timeout'));
    });
    req.write(body);
    req.end();
  });
}

/** Fetch main zone status XML */
async function fetchMainZoneStatus(host: string, port: number) {
  const xml = await httpGet(host, port, '/goform/formMainZone_MainZoneXmlStatus.xml');
  return parseStringPromise(xml, { explicitArray: false });
}

/** Fetch detailed status via AppCommand XML API */
async function fetchAppCommand(host: string, port: number, commands: string[]): Promise<any> {
  const cmdXml = commands.map((c) => `<cmd id="1">${c}</cmd>`).join('');
  const body = `<?xml version="1.0" encoding="utf-8"?><tx>${cmdXml}</tx>`;
  const xml = await httpPostXml(host, port, '/goform/AppCommand.xml', body);
  return parseStringPromise(xml, { explicitArray: false });
}

/** Fetch detailed info via AppCommand0300 XML API */
async function fetchAppCommand0300(host: string, port: number, commands: { name: string; params: string[] }[]): Promise<any> {
  const cmdXml = commands
    .map((c) => {
      const params = c.params.map((p) => `<param name="${p}"></param>`).join('');
      return `<cmd id="3"><name>${c.name}</name><list>${params}</list></cmd>`;
    })
    .join('');
  const body = `<?xml version="1.0" encoding="utf-8"?><tx>${cmdXml}</tx>`;
  const xml = await httpPostXml(host, port, '/goform/AppCommand0300.xml', body);
  return parseStringPromise(xml, { explicitArray: false });
}

/**
 * Parse speaker configuration from GetActiveSpeaker response.
 *
 * The Marantz AVR returns per-channel numeric values:
 *   0 = not in the configured layout (omit)
 *   1 = configured but not currently active (show grey)
 *   2 = configured and actively receiving signal (show blue)
 *
 * This returns ALL configured speakers (value > 0), with `active`
 * reflecting whether they are currently receiving signal (value >= 2).
 */
function parseActiveSpeakers(data: any): SpeakerStatus[] {
  const speakers: SpeakerStatus[] = [];
  const seen = new Set<string>();

  try {
    const cmds = Array.isArray(data?.rx?.cmd) ? data.rx.cmd : [data?.rx?.cmd];

    for (const cmd of cmds) {
      if (!cmd) continue;
      const cmdName = typeof cmd.name === 'string' ? cmd.name : '';
      if (!cmdName.includes('GetActiveSpeaker')) continue;

      const list = cmd.list;
      if (!list) continue;

      const params = Array.isArray(list.param) ? list.param : [list.param];

      // --- Format 1: structured object with channel codes as properties ---
      // <param name="activespall"><FL>2</FL><FR>2</FR>...</param>
      // xml2js → { "$": { "name": "activespall" }, "FL": "2", "FR": "2", ... }
      for (const param of params) {
        if (!param || typeof param !== 'object') continue;
        const pName = param?.$?.name || '';
        if (pName !== 'activespall') continue;

        for (const [key, value] of Object.entries(param)) {
          if (key === '$' || key === '_') continue;
          const code = key.toUpperCase();
          if (!(code in CHANNEL_MAP) || seen.has(code)) continue;

          const numVal = parseInt(String(value), 10);
          if (isNaN(numVal) || numVal <= 0) continue; // 0 = not configured

          seen.add(code);
          speakers.push({
            code,
            name: CHANNEL_MAP[code].name,
            active: numVal >= 2,
            group: CHANNEL_MAP[code].group,
          });
        }
      }

      if (speakers.length > 0) break;

      // --- Format 2: individual params per channel ---
      // <param name="FL">2</param><param name="FR">2</param>...
      // xml2js → [{ "$": { "name": "FL" }, "_": "2" }, ...]
      for (const param of params) {
        if (!param || typeof param !== 'object') continue;
        const code = (param?.$?.name || '').toUpperCase();
        if (!(code in CHANNEL_MAP) || seen.has(code)) continue;

        const val = typeof param._ === 'string' ? param._ : typeof param === 'string' ? param : '';
        const numVal = parseInt(val, 10);
        if (isNaN(numVal) || numVal <= 0) continue;

        seen.add(code);
        speakers.push({
          code,
          name: CHANNEL_MAP[code].name,
          active: numVal >= 2,
          group: CHANNEL_MAP[code].group,
        });
      }

      if (speakers.length > 0) break;

      // --- Format 3: space/comma-separated text list of active channel codes ---
      // <param name="activespall">FL FR C SW SL SR...</param>
      // xml2js → { "$": { "name": "activespall" }, "_": "FL FR C..." }
      for (const param of params) {
        if (!param) continue;
        const pName = (typeof param === 'object' ? param?.$?.name : '') || '';
        const text = typeof param._ === 'string' ? param._ : typeof param === 'string' ? param : '';
        if (!text || (!pName.toLowerCase().includes('active') && !pName.toLowerCase().includes('speaker'))) continue;

        const tokens = text.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
        for (const token of tokens) {
          if (token in CHANNEL_MAP && !seen.has(token)) {
            seen.add(token);
            speakers.push({
              code: token,
              name: CHANNEL_MAP[token].name,
              active: true, // text-only format cannot distinguish active vs configured
              group: CHANNEL_MAP[token].group,
            });
          }
        }
      }

      if (speakers.length > 0) break;
    }
  } catch (e) {
    console.error('[HTTP] Error parsing active speakers:', e);
  }

  return speakers.sort((a, b) => a.code.localeCompare(b.code));
}

/** Parse source rename data */
function parseSourceRenames(data: any): Record<string, string> {
  const renames: Record<string, string> = {};
  try {
    const cmds = Array.isArray(data?.rx?.cmd) ? data.rx.cmd : [data?.rx?.cmd];
    for (const cmd of cmds) {
      if (!cmd) continue;
      const name = cmd?.name || '';
      if (typeof name === 'string' && name.includes('GetSourceRename')) {
        const list = cmd?.list;
        if (list) {
          // list contains param elements with name=sourceId and value=custom name
          const params = Array.isArray(list.param) ? list.param : [list.param];
          for (const p of params) {
            if (p && p.$ && p.$?.name && p._) {
              renames[p.$.name] = p._;
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('[HTTP] Error parsing source renames:', e);
  }
  return renames;
}

/** Parse video info from response */
function parseVideoInfo(data: any): { inputResolution: string; outputResolution: string; hdrFormat: string; inputSignal: string } {
  const result = {
    inputResolution: '---',
    outputResolution: '---',
    hdrFormat: '---',
    inputSignal: '---',
  };

  try {
    const cmds = Array.isArray(data?.rx?.cmd) ? data.rx.cmd : [data?.rx?.cmd];
    for (const cmd of cmds) {
      if (!cmd) continue;
      const name = cmd?.name || '';
      if (typeof name === 'string' && name.includes('GetVideoInfo')) {
        const list = cmd?.list;
        if (list) {
          const params = Array.isArray(list.param) ? list.param : [list.param];
          for (const p of params) {
            if (!p || !p.$) continue;
            const pName = p.$.name;
            const val = p._ || p;
            if (pName === 'hdmisigin' && typeof val === 'string') result.inputResolution = val || '---';
            if (pName === 'hdmisigout' && typeof val === 'string') result.outputResolution = val || '---';
            if (pName === 'videooutput' && typeof val === 'string') result.inputSignal = val || '---';
          }
        }
      }
    }
  } catch (e) {
    console.error('[HTTP] Error parsing video info:', e);
  }

  return result;
}

/** Parse audio info from response */
function parseAudioInfo(data: any): { inputFormat: string; soundMode: string; samplingRate: string } {
  const result = {
    inputFormat: '---',
    soundMode: '---',
    samplingRate: '---',
  };

  try {
    const cmds = Array.isArray(data?.rx?.cmd) ? data.rx.cmd : [data?.rx?.cmd];
    for (const cmd of cmds) {
      if (!cmd) continue;
      const name = cmd?.name || '';
      if (typeof name === 'string' && name.includes('GetAudioInfo')) {
        const list = cmd?.list;
        if (list) {
          const params = Array.isArray(list.param) ? list.param : [list.param];
          for (const p of params) {
            if (!p || !p.$) continue;
            const pName = p.$.name;
            const val = p._ || p;
            if (pName === 'signal' && typeof val === 'string') result.inputFormat = val || '---';
            if (pName === 'sound' && typeof val === 'string') result.soundMode = val || '---';
            if (pName === 'fs' && typeof val === 'string') result.samplingRate = val || '---';
          }
        }
      }
    }
  } catch (e) {
    console.error('[HTTP] Error parsing audio info:', e);
  }

  return result;
}

/**
 * Fetch full status from the Marantz receiver via HTTP/XML APIs.
 * Combines MainZone status + AppCommand queries.
 */
export async function fetchHttpStatus(host: string, httpPort: number): Promise<any> {
  const result: any = {};

  // 1. Fetch main zone status (power, volume, mute, input, surround mode)
  try {
    const mainZone = await fetchMainZoneStatus(host, httpPort);
    const item = mainZone?.item;
    if (item) {
      // Power
      const power = item.Power?.value || item.ZonePower?.value;
      if (power) result.power = power === 'ON' ? 'ON' : 'OFF';

      // Volume
      const vol = item.MasterVolume?.value;
      if (vol && vol !== '--') {
        result.volume = parseFloat(vol);
      }

      // Mute
      result.muted = item.Mute?.value === 'on';

      // Input source
      const inputId = item.InputFuncSelect?.value;
      if (inputId) {
        const customName = item.RenameSource?.value?.[`trim_${inputId}`] || '';
        result.input = {
          id: inputId,
          name: customName || SOURCE_MAP[inputId] || inputId,
          selected: true,
        } satisfies InputSource;
      }

      // Surround mode
      const sm = item.selectSurround?.value;
      if (sm) result.surroundMode = sm;
    }
  } catch (e: any) {
    console.error('[HTTP] MainZone fetch error:', e.message);
  }

  // 2. Fetch detailed info via AppCommand0300
  try {
    const details = await fetchAppCommand0300(host, httpPort, [
      { name: 'GetActiveSpeaker', params: ['activespall'] },
      { name: 'GetSourceRename', params: [] },
      { name: 'GetVideoInfo', params: ['videooutput', 'hdmisigin', 'hdmisigout'] },
      { name: 'GetAudioInfo', params: ['inputmode', 'output', 'signal', 'sound', 'fs'] },
    ]);

    // Active speakers
    result.speakers = parseActiveSpeakers(details);

    // Source renames
    const renames = parseSourceRenames(details);

    // Build available inputs list with custom names
    const defaultSources = Object.keys(SOURCE_MAP);
    result.availableInputs = defaultSources.map((id) => ({
      id,
      name: renames[id] || SOURCE_MAP[id] || id,
      selected: id === result.input?.id,
    }));

    // Update current input name if we have a custom name
    if (result.input && renames[result.input.id]) {
      result.input.name = renames[result.input.id];
    }

    // Video info
    const videoInfo = parseVideoInfo(details);
    result.video = {
      inputResolution: videoInfo.inputResolution,
      outputResolution: videoInfo.outputResolution,
      hdrFormat: videoInfo.hdrFormat,
      inputSignal: videoInfo.inputSignal,
      hdmiOutput: 'Auto',
    };

    // Audio info
    const audioInfo = parseAudioInfo(details);
    result.audio = {
      inputFormat: audioInfo.inputFormat,
      soundMode: audioInfo.soundMode,
      samplingRate: audioInfo.samplingRate,
    };
  } catch (e: any) {
    console.error('[HTTP] AppCommand0300 fetch error:', e.message);
  }

  return result;
}
