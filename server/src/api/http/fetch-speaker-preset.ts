import { parseSpeakerPreset } from '../parsers/index.js';
import { fetchWebControlConfig } from './fetch-web-control-config.js';

const SPEAKER_PRESET_CONFIG_TYPE = 11;

export const fetchSpeakerPreset = async (host: string): Promise<1 | 2 | null> => {
  const data = await fetchWebControlConfig(host, '/ajax/speakers/get_config', SPEAKER_PRESET_CONFIG_TYPE);
  return parseSpeakerPreset(data);
};
