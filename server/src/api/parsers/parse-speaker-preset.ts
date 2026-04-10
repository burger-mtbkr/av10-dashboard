const extractText = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (value && typeof value === 'object') {
    const textValue = (value as { _?: unknown; '#text'?: unknown })._ ?? (value as { '#text'?: unknown })['#text'];
    if (typeof textValue === 'string' && textValue.trim()) {
      return textValue.trim();
    }
  }

  return '';
};

export const parseSpeakerPreset = (data: unknown): 1 | 2 | null => {
  const value = extractText((data as { SpeakerPreset?: unknown })?.SpeakerPreset);

  if (value === '1') {
    return 1;
  }

  if (value === '2') {
    return 2;
  }

  return null;
};