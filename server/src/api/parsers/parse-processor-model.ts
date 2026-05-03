import { PLACEHOLDER_VALUE } from '../../core/constants.js';

const BRAND_NAME_MAP: Record<string, string> = {
  '1': 'Denon',
  '2': 'Marantz',
  '3': 'McIntosh',
};

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

export const parseProcessorModel = (ownerManualData: unknown, brandData?: unknown): string => {
  const modelName = extractText(
    (ownerManualData as { OwnerManual?: { ModelName?: unknown } })?.OwnerManual?.ModelName,
  );
  const brandCode = extractText((brandData as { Brand?: unknown })?.Brand);
  const brandName = BRAND_NAME_MAP[brandCode] || '';

  if (modelName && brandName && !modelName.toLowerCase().startsWith(brandName.toLowerCase())) {
    return `${brandName} ${modelName}`;
  }

  return modelName || brandName || PLACEHOLDER_VALUE;
};