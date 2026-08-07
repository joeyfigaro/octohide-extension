import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  clearCache,
  clearOverride,
  getAllOverrides,
  getCached,
  getOverride,
  getRepoOverrides,
  getSettings,
  setCached,
  setOverride,
  setSettings,
} from "@/lib/storage";

beforeEach(() => {
  fakeBrowser.reset();
});

describe("settings", () => {
  it("defaults to enabled when unset", async () => {
    expect(await getSettings()).toEqual({ enabled: true });
  });

  it("round-trips settings including the pat", async () => {
    await setSettings({ enabled: false, pat: "ghp_secret" });
    expect(await getSettings()).toEqual({ enabled: false, pat: "ghp_secret" });
  });
});

describe("overrides", () => {
  const repo = "octocat/hello-world";
  const other = "octocat/other";

  it("sets and gets an override", async () => {
    await setOverride(repo, "ci.yml", "hide");
    expect(await getOverride(repo, "ci.yml")).toBe("hide");
  });

  it("returns null for a missing override", async () => {
    expect(await getOverride(repo, "ci.yml")).toBeNull();
  });

  it("clears an override", async () => {
    await setOverride(repo, "ci.yml", "show");
    await clearOverride(repo, "ci.yml");
    expect(await getOverride(repo, "ci.yml")).toBeNull();
  });

  it("returns only the requested repo overrides", async () => {
    await setOverride(repo, "ci.yml", "hide");
    await setOverride(repo, "release.yml", "show");
    await setOverride(other, "deploy.yml", "hide");
    expect(await getRepoOverrides(repo)).toEqual({
      "ci.yml": "hide",
      "release.yml": "show",
    });
  });

  it("returns an empty object for a repo with no overrides", async () => {
    expect(await getRepoOverrides(repo)).toEqual({});
  });

  it("nests all overrides by repo", async () => {
    await setOverride(repo, "ci.yml", "hide");
    await setOverride(other, "deploy.yml", "show");
    expect(await getAllOverrides()).toEqual({
      [repo]: { "ci.yml": "hide" },
      [other]: { "deploy.yml": "show" },
    });
  });
});

describe("detection cache", () => {
  const repo = "octocat/hello-world";
  const ttl = 60_000;

  it("returns the cached value within the ttl", async () => {
    await setCached(repo, "ci.yml", true, 1_000);
    expect(await getCached(repo, "ci.yml", ttl, 2_000)).toBe(true);
  });

  it("returns null when the entry is stale", async () => {
    await setCached(repo, "ci.yml", true, 1_000);
    expect(await getCached(repo, "ci.yml", ttl, 1_000 + ttl + 1)).toBeNull();
  });

  it("returns null on a miss", async () => {
    expect(await getCached(repo, "ci.yml", ttl, 1_000)).toBeNull();
  });

  it("stores false values distinctly from a miss", async () => {
    await setCached(repo, "ci.yml", false, 1_000);
    expect(await getCached(repo, "ci.yml", ttl, 2_000)).toBe(false);
  });

  it("empties the cache", async () => {
    await setCached(repo, "ci.yml", true, 1_000);
    await clearCache();
    expect(await getCached(repo, "ci.yml", ttl, 2_000)).toBeNull();
  });
});
