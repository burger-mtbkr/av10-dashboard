import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { IEqBand, IEqProfile, IEqProfilesStoreData, SpeakerPreset } from '../../types/eq.js';
import { clampGainDb, ensureUniqueName, sanitizeProfileName, validateBands, validateStoreData } from './validators.js';

/** Single canonical store: `server/data/eq-profiles.json` (override with `EQ_PROFILES_JSON_PATH`). */
function canonicalEqProfilesPath(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  return resolve(moduleDir, '../../../data/eq-profiles.json');
}

const LEGACY_EQ_FILENAMES = ['eq-profiles.json'] as const;

function legacyEqProfileCandidates(): string[] {
  const cwd = process.cwd();
  const out: string[] = [];
  for (const name of LEGACY_EQ_FILENAMES) {
    out.push(resolve(cwd, name));
    out.push(resolve(cwd, '..', name));
  }
  return out;
}

/** Resolve the EQ profiles JSON path. Legacy repo-root copies are migrated or removed so only one file remains. */
export function discoverEqProfilesJsonPath(): string {
  const env = process.env.EQ_PROFILES_JSON_PATH?.trim();
  if (env) {
    return resolve(env);
  }

  const canonicalPath = canonicalEqProfilesPath();
  const legacyPaths = legacyEqProfileCandidates().filter(
    (p) => existsSync(p) && resolve(p) !== resolve(canonicalPath),
  );

  if (existsSync(canonicalPath)) {
    for (const legacy of legacyPaths) {
      try {
        unlinkSync(legacy);
      } catch {
        /* ignore — best-effort cleanup of obsolete duplicate */
      }
    }
    return canonicalPath;
  }

  // Migrate first legacy file found into the canonical location (older setups used repo root).
  mkdirSync(dirname(canonicalPath), { recursive: true });
  const donor = legacyPaths[0];
  if (donor) {
    try {
      renameSync(donor, canonicalPath);
    } catch {
      copyFileSync(donor, canonicalPath);
      try {
        unlinkSync(donor);
      } catch {
        /* ignore */
      }
    }
    return canonicalPath;
  }

  return canonicalPath;
}

export interface ISaveEqProfileInput {
  profileId?: string;
  name: string;
  bands: IEqBand[];
}

export class EqProfilesStore {
  private readonly path: string;

  constructor(path = discoverEqProfilesJsonPath()) {
    this.path = path;
    if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
      console.log(`[EqProfilesStore] ${this.path}`);
    }
  }

  private getDefaultData(): IEqProfilesStoreData {
    const bandFrequenciesHz = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    const makeFlatProfile = (): IEqProfile => ({
      id: 'default',
      name: 'Default',
      readonly: true,
      updatedAt: new Date().toISOString(),
      bands: bandFrequenciesHz.map((frequencyHz) => ({ frequencyHz, gainDb: 0 })),
    });
    return {
      version: 1,
      bandFrequenciesHz,
      presets: {
        1: { defaultProfiles: [makeFlatProfile()], customProfiles: [] },
        2: { defaultProfiles: [makeFlatProfile()], customProfiles: [] },
      },
    };
  }

  private loadData(): IEqProfilesStoreData {
    if (!existsSync(this.path)) {
      const initial = this.getDefaultData();
      this.saveData(initial);
      return initial;
    }

    const raw = JSON.parse(readFileSync(this.path, 'utf-8')) as IEqProfilesStoreData;
    const error = validateStoreData(raw);
    if (error) {
      throw new Error(`Invalid eq-profiles.json: ${error}`);
    }
    return raw;
  }

  private saveData(data: IEqProfilesStoreData): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const tempPath = `${this.path}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
    renameSync(tempPath, this.path);
  }

  listProfiles(preset: SpeakerPreset): {
    bandFrequenciesHz: number[];
    profiles: IEqProfile[];
    graphicEqAdjustmentsEnabled: boolean;
  } {
    const data = this.loadData();
    const presetData = data.presets[preset];
    return {
      bandFrequenciesHz: data.bandFrequenciesHz,
      profiles: [...presetData.defaultProfiles, ...presetData.customProfiles],
      graphicEqAdjustmentsEnabled: presetData.graphicEqAdjustmentsEnabled !== false,
    };
  }

  saveCustomProfile(preset: SpeakerPreset, input: ISaveEqProfileInput): IEqProfile {
    const data = this.loadData();
    const presetData = data.presets[preset];
    const name = sanitizeProfileName(input.name);
    if (!name) {
      throw new Error('Profile name is required');
    }

    const bandsError = validateBands(input.bands, data.bandFrequenciesHz);
    if (bandsError) {
      throw new Error(bandsError);
    }

    const bands = input.bands.map((band) => ({
      frequencyHz: band.frequencyHz,
      gainDb: clampGainDb(band.gainDb),
    }));

    if (input.profileId) {
      const existing = presetData.customProfiles.find((profile) => profile.id === input.profileId);
      if (!existing) {
        throw new Error('Custom profile not found');
      }
      if (!ensureUniqueName(name, [...presetData.defaultProfiles, ...presetData.customProfiles], existing.id)) {
        throw new Error('Profile name must be unique in this preset');
      }
      existing.name = name;
      existing.bands = bands;
      existing.updatedAt = new Date().toISOString();
      this.saveData(data);
      return existing;
    }

    if (!ensureUniqueName(name, [...presetData.defaultProfiles, ...presetData.customProfiles])) {
      throw new Error('Profile name must be unique in this preset');
    }

    const created: IEqProfile = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      readonly: false,
      updatedAt: new Date().toISOString(),
      bands,
    };
    presetData.customProfiles.push(created);
    this.saveData(data);
    return created;
  }

  findProfile(preset: SpeakerPreset, profileId: string): IEqProfile | null {
    const { profiles } = this.listProfiles(preset);
    return profiles.find((profile) => profile.id === profileId) ?? null;
  }
}
