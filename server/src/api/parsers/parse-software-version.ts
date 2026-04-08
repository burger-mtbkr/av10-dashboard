export const parseSoftwareVersion = (data: unknown): string => {
  const version = (data as { Information?: { Firmware?: { Version?: string } } })?.Information?.Firmware?.Version;
  return typeof version === 'string' && version.trim() ? version.trim() : '---';
};