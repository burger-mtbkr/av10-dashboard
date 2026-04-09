import { SOURCE_MAP, SMART_SELECT_DEFAULTS, SMART_SELECT_SLOTS } from '../constants.js';
import type { IInputSource, ISmartSelectPreset } from '../types.js';
import type { IHttpStatusResult } from './types.js';
import { fetchAppCommand0300 } from './fetch-app-command-0300.js';
import { fetchHeosQuickSelectNames } from './fetch-heos-quick-select-names.js';
import { fetchMainZoneStatus } from './fetch-main-zone-status.js';
import { fetchWebControlConfig } from './fetch-web-control-config.js';
import {
  parseActiveSpeakers,
  parseAudioInfo,
  parseNetworkInfo,
  parseProcessorModel,
  parseSmartSelectNames,
  parseSoftwareVersion,
  parseSourceRenames,
  parseVideoInfo,
} from './parsers/index.js';

export const fetchHttpStatus = async (host: string, httpPort: number): Promise<IHttpStatusResult> => {
  let result: IHttpStatusResult = {};

  try {
    const mainZone = await fetchMainZoneStatus(host, httpPort);
    const item = (mainZone as { item?: Record<string, any> })?.item;

    if (item) {
      const power = item.Power?.value || item.ZonePower?.value;
      if (power) {
        result.power = power === 'ON' ? 'ON' : 'OFF';
      }

      const volume = item.MasterVolume?.value;
      if (volume && volume !== '--') {
        result.volume = parseFloat(volume);
      }

      result.muted = item.Mute?.value === 'on';

      const inputId = item.InputFuncSelect?.value;
      if (inputId) {
        const customName = item.RenameSource?.value?.[`trim_${inputId}`] || '';
        result.input = {
          id: inputId,
          name: customName || SOURCE_MAP[inputId] || inputId,
          selected: true,
        } satisfies IInputSource;
      }

      if (item.selectSurround?.value) {
        result.surroundMode = item.selectSurround.value;
      }
    }
  } catch (error) {
    console.error('[HTTP] MainZone fetch error:', (error as Error).message);
  }

  try {
    const details = await fetchAppCommand0300(host, httpPort, [
      { name: 'GetActiveSpeaker', params: ['activespall'] },
      { name: 'GetSourceRename', params: [] },
      { name: 'GetRenameQuickselect', params: ['quick1', 'quick2', 'quick3', 'quick4'] },
      { name: 'GetRenameSmartselect', params: ['smart1', 'smart2', 'smart3', 'smart4'] },
      { name: 'GetVideoInfo', params: ['videooutput', 'hdmisigin', 'hdmisigout'] },
      { name: 'GetAudioInfo', params: ['inputmode', 'output', 'signal', 'sound', 'fs'] },
    ]);

    result.speakers = parseActiveSpeakers(details);
    const renames = parseSourceRenames(details);
    result.smartSelect = parseSmartSelectNames(details);

    result.availableInputs = Object.keys(SOURCE_MAP).map((id) => ({
      id,
      name: renames[id] || SOURCE_MAP[id] || id,
      selected: id === result.input?.id,
    }));

    if (result.input && renames[result.input.id]) {
      result.input = {
        ...result.input,
        name: renames[result.input.id],
      };
    }

    result.video = {
      ...parseVideoInfo(details),
      hdmiOutput: 'Auto',
    };
    result.audio = parseAudioInfo(details);
  } catch (error) {
    console.error('[HTTP] AppCommand0300 fetch error:', (error as Error).message);
  }

  try {
    const heosNames = await fetchHeosQuickSelectNames(host);
    if (heosNames.length > 0) {
      const smartSelect = result.smartSelect ?? SMART_SELECT_SLOTS.map((slot) => ({
        number: slot,
        name: SMART_SELECT_DEFAULTS[slot],
        active: false,
      } satisfies ISmartSelectPreset));

      result.smartSelect = smartSelect.map((preset) => {
        const heosPreset = heosNames.find(({ id }) => id === preset.number);
        return heosPreset ? { ...preset, name: heosPreset.name } : preset;
      });
    }
  } catch (error) {
    console.error('[HTTP] HEOS smart select fetch error:', (error as Error).message);
  }

  const [generalInfoResult, networkInfoResult, ownerManualResult, brandResult] = await Promise.allSettled([
    fetchWebControlConfig(host, '/ajax/general/get_config', 12),
    fetchWebControlConfig(host, '/ajax/network/get_config', 2),
    fetchWebControlConfig(host, '/ajax/general/get_config', 23),
    fetchWebControlConfig(host, '/ajax/globals/get_config', 1),
  ]);

  if (generalInfoResult.status === 'fulfilled') {
    result.softwareVersion = parseSoftwareVersion(generalInfoResult.value);
  } else {
    const reason = generalInfoResult.reason;
    console.error('[HTTP] Web control general config fetch error:', reason instanceof Error ? reason.message : reason);
  }

  if (networkInfoResult.status === 'fulfilled') {
    result = { ...result, ...parseNetworkInfo(networkInfoResult.value) };
  } else {
    const reason = networkInfoResult.reason;
    console.error('[HTTP] Web control network config fetch error:', reason instanceof Error ? reason.message : reason);
  }

  if (ownerManualResult.status === 'fulfilled' || brandResult.status === 'fulfilled') {
    result.processorModel = parseProcessorModel(
      ownerManualResult.status === 'fulfilled' ? ownerManualResult.value : undefined,
      brandResult.status === 'fulfilled' ? brandResult.value : undefined,
    );
  }

  if (ownerManualResult.status === 'rejected') {
    const reason = ownerManualResult.reason;
    console.error('[HTTP] Web control owner manual fetch error:', reason instanceof Error ? reason.message : reason);
  }

  if (brandResult.status === 'rejected') {
    const reason = brandResult.reason;
    console.error('[HTTP] Web control globals fetch error:', reason instanceof Error ? reason.message : reason);
  }

  return result;
};