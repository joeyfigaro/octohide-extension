import { browser } from "wxt/browser";

export interface Settings {
  enabled: boolean;
  pat?: string;
}

export type Override = "hide" | "show";

export interface CacheEntry {
  reusableOnly: boolean;
  fetchedAt: number;
}

const SETTINGS_KEY = "wve:settings";
const OVERRIDES_KEY = "wve:overrides";
const CACHE_KEY = "wve:cache";

type OverridesMap = Record<string, Record<string, Override>>;
type CacheMap = Record<string, Record<string, CacheEntry>>;

async function read<T>(key: string, fallback: T): Promise<T> {
  const stored = await browser.storage.local.get(key);
  const value = stored[key];
  if (value === undefined) return fallback;
  if (typeof value !== typeof fallback || value === null) return fallback;
  return value as T;
}

async function write(key: string, value: unknown): Promise<void> {
  await browser.storage.local.set({ [key]: value });
}

export async function getSettings(): Promise<Settings> {
  return read<Settings>(SETTINGS_KEY, { enabled: true });
}

export async function setSettings(settings: Settings): Promise<void> {
  await write(SETTINGS_KEY, settings);
}

export async function getOverride(
  repoKey: string,
  filename: string,
): Promise<Override | null> {
  const overrides = await read<OverridesMap>(OVERRIDES_KEY, {});
  return overrides[repoKey]?.[filename] ?? null;
}

export async function setOverride(
  repoKey: string,
  filename: string,
  override: Override,
): Promise<void> {
  const overrides = await read<OverridesMap>(OVERRIDES_KEY, {});
  const repo = overrides[repoKey] ?? {};
  repo[filename] = override;
  overrides[repoKey] = repo;
  await write(OVERRIDES_KEY, overrides);
}

export async function clearOverride(
  repoKey: string,
  filename: string,
): Promise<void> {
  const overrides = await read<OverridesMap>(OVERRIDES_KEY, {});
  const repo = overrides[repoKey];
  if (!repo) return;
  delete repo[filename];
  if (Object.keys(repo).length === 0) {
    delete overrides[repoKey];
  } else {
    overrides[repoKey] = repo;
  }
  await write(OVERRIDES_KEY, overrides);
}

export async function getRepoOverrides(
  repoKey: string,
): Promise<Record<string, Override>> {
  const overrides = await read<OverridesMap>(OVERRIDES_KEY, {});
  return overrides[repoKey] ?? {};
}

export async function getAllOverrides(): Promise<OverridesMap> {
  return read<OverridesMap>(OVERRIDES_KEY, {});
}

export async function getCached(
  repoKey: string,
  filename: string,
  ttlMs: number,
  now: number = Date.now(),
): Promise<boolean | null> {
  const cache = await read<CacheMap>(CACHE_KEY, {});
  const entry = cache[repoKey]?.[filename];
  if (!entry) return null;
  if (now - entry.fetchedAt >= ttlMs) return null;
  return entry.reusableOnly;
}

export async function setCached(
  repoKey: string,
  filename: string,
  reusableOnly: boolean,
  now: number = Date.now(),
): Promise<void> {
  const cache = await read<CacheMap>(CACHE_KEY, {});
  const repo = cache[repoKey] ?? {};
  repo[filename] = { reusableOnly, fetchedAt: now };
  cache[repoKey] = repo;
  await write(CACHE_KEY, cache);
}

export async function clearCache(): Promise<void> {
  await write(CACHE_KEY, {});
}
