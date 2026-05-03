import { receiverHttpClient, toHttpRequestError } from './client.js';

const WEB_CONTROL_PORT = 11080;
const SPEAKER_PRESET_CONFIG_TYPE = '11';

export const setSpeakerPreset = async (host: string, preset: 1 | 2): Promise<void> => {
  const query = new URLSearchParams({
    type: SPEAKER_PRESET_CONFIG_TYPE,
    data: `<SpeakerPreset>${preset}</SpeakerPreset>`,
  });

  try {
    await receiverHttpClient.get(
      `http://${host}:${WEB_CONTROL_PORT}/ajax/speakers/set_config?${query.toString()}`,
    );
  } catch (error) {
    throw toHttpRequestError(error);
  }
};
