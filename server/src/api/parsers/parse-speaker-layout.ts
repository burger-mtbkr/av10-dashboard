const toArray = <T>(value: T | T[] | undefined): T[] => {
  if (Array.isArray(value)) {
    return value;
  }

  return value === undefined ? [] : [value];
};

const extractValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value && typeof value === 'object') {
    const candidate = (value as { _?: unknown; '#text'?: unknown; Value?: unknown })._
      ?? (value as { '#text'?: unknown })['#text']
      ?? (value as { Value?: unknown }).Value;

    if (typeof candidate === 'string') {
      return candidate.trim();
    }
  }

  return '';
};

const checkboxToCount = (value: string, countWhenEnabled: number): number => (value === '4' ? countWhenEnabled : 0);

const parseIndexedCount = (value: string, mapping: Record<string, number>): number => mapping[value] ?? 0;

export const parseSpeakerLayout = (data: unknown): string => {
  const items = toArray(
    (data as { SpeakerLayout?: { List?: { Item?: unknown | unknown[] } } })?.SpeakerLayout?.List?.Item,
  );

  if (items.length === 0) {
    return '';
  }

  const getConfigValue = (index: string): string => {
    const item = items.find((candidate) => {
      const attributes = (candidate as { $?: { index?: string } })?.$;
      return attributes?.index === index;
    }) as { Config?: { Value?: unknown }; Value?: unknown } | undefined;

    if (!item) {
      return '';
    }

    if (item.Config) {
      return extractValue(item.Config.Value);
    }

    return extractValue(item.Value);
  };

  const centerCount = checkboxToCount(getConfigValue('3'), 1);
  const surroundCount = checkboxToCount(getConfigValue('4'), 2);
  const surroundBackCount = parseIndexedCount(getConfigValue('5'), {
    '6': 1,
    '7': 2,
    '8': 3,
    '9': 4,
  });
  const frontWideCount = checkboxToCount(getConfigValue('6'), 2);
  const heightCount = parseIndexedCount(getConfigValue('8'), {
    '1': 2,
    '2': 4,
    '3': 5,
    '4': 6,
    '5': 7,
    '6': 8,
  });

  const explicitSubCount = parseIndexedCount(getConfigValue('15'), {
    '6': 1,
    '7': 2,
    '8': 3,
    '9': 4,
  });
  const subCount = explicitSubCount > 0 ? explicitSubCount : checkboxToCount(getConfigValue('14'), 1);

  const earCount = 2 + centerCount + surroundCount + surroundBackCount + frontWideCount;

  if (earCount <= 0) {
    return '';
  }

  return heightCount > 0 ? `${earCount}.${subCount}.${heightCount}` : `${earCount}.${subCount}`;
};