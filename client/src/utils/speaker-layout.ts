import type { ISpeakerStatus } from '../types';

export const getSpeakerLayoutLabel = (speakers: ISpeakerStatus[]): string => {
  if (speakers.length === 0) {
    return '';
  }

  const earCount = speakers.filter(
    ({ group }) => group === 'ear' || group === 'wide' || group === 'back',
  ).length;
  const subCount = speakers.filter(({ group }) => group === 'sub').length;
  const heightCount = speakers.filter(({ group }) => group === 'height').length;

  return heightCount > 0
    ? `${earCount}.${subCount}.${heightCount}`
    : `${earCount}.${subCount}`;
};