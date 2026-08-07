import { useEffect, useState } from "react";
import {
  clearCache,
  clearOverride,
  getAllOverrides,
  getSettings,
  setSettings,
  type Override,
  type Settings,
} from "@/lib/storage";

type OverridesMap = Record<string, Record<string, Override>>;

const styles: Record<string, React.CSSProperties> = {
  page: {
    colorScheme: "light dark",
    maxWidth: 640,
    margin: "0 auto",
    padding: "24px 20px 48px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    lineHeight: 1.5,
  },
  title: { fontSize: 22, fontWeight: 600, margin: "0 0 24px" },
  section: {
    border: "1px solid",
    borderColor: "GrayText",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 15, fontWeight: 600, margin: "0 0 12px" },
  helper: { color: "GrayText", fontSize: 12, margin: "4px 0 0" },
  row: { display: "flex", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    minWidth: 0,
    padding: "6px 8px",
    fontSize: 14,
    borderRadius: 6,
    border: "1px solid",
    borderColor: "GrayText",
    background: "Field",
    color: "FieldText",
  },
  button: {
    padding: "6px 12px",
    fontSize: 13,
    borderRadius: 6,
    border: "1px solid",
    borderColor: "GrayText",
    background: "ButtonFace",
    color: "ButtonText",
    cursor: "pointer",
  },
  repoGroup: { marginTop: 12 },
  repoKey: { fontWeight: 600, fontSize: 13, margin: "0 0 6px" },
  overrideRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 0",
  },
  filename: { flex: 1, minWidth: 0, wordBreak: "break-all" },
  badge: {
    fontSize: 11,
    padding: "1px 6px",
    borderRadius: 4,
    border: "1px solid",
    borderColor: "GrayText",
  },
  empty: { color: "GrayText", fontStyle: "italic" },
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettingsState] = useState<Settings>({ enabled: true });
  const [patInput, setPatInput] = useState("");
  const [patSaved, setPatSaved] = useState(false);
  const [overrides, setOverrides] = useState<OverridesMap>({});
  const [cacheCleared, setCacheCleared] = useState(false);

  async function refreshOverrides() {
    setOverrides(await getAllOverrides());
  }

  useEffect(() => {
    (async () => {
      const [loadedSettings, loadedOverrides] = await Promise.all([
        getSettings(),
        getAllOverrides(),
      ]);
      setSettingsState(loadedSettings);
      setPatInput(loadedSettings.pat ?? "");
      setOverrides(loadedOverrides);
      setLoading(false);
    })();
  }, []);

  async function persist(next: Settings) {
    setSettingsState(next);
    await setSettings(next);
  }

  async function onToggleEnabled(enabled: boolean) {
    await persist({ ...settings, enabled });
  }

  async function onSaveToken() {
    const trimmed = patInput.trim();
    const next: Settings = { ...settings };
    if (trimmed) {
      next.pat = trimmed;
    } else {
      delete next.pat;
    }
    await persist(next);
    setPatSaved(true);
    setTimeout(() => setPatSaved(false), 1500);
  }

  async function onClearToken() {
    setPatInput("");
    const next: Settings = { ...settings };
    delete next.pat;
    await persist(next);
  }

  async function onRemoveOverride(repoKey: string, filename: string) {
    await clearOverride(repoKey, filename);
    await refreshOverrides();
  }

  async function onClearCache() {
    await clearCache();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 1500);
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={styles.empty}>Loading…</p>
      </div>
    );
  }

  const repoKeys = Object.keys(overrides).sort();

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Workflow Visibility</h1>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>General</h2>
        <label style={styles.row}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => onToggleEnabled(e.target.checked)}
          />
          <span>Enable workflow hiding</span>
        </label>
        <p style={styles.helper}>
          When off, all workflows remain visible in the Actions sidebar.
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Personal access token</h2>
        <div style={styles.row}>
          <input
            style={styles.input}
            type="password"
            placeholder="ghp_…"
            value={patInput}
            onChange={(e) => setPatInput(e.target.value)}
            onBlur={onSaveToken}
          />
          <button style={styles.button} onClick={onSaveToken}>
            {patSaved ? "Saved" : "Save token"}
          </button>
          <button style={styles.button} onClick={onClearToken}>
            Clear
          </button>
        </div>
        <p style={styles.helper}>
          Optional. Only used as a fallback for private repositories when the
          browser session cannot fetch workflow files.
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Manual overrides</h2>
        {repoKeys.length === 0 ? (
          <p style={styles.empty}>No manual overrides</p>
        ) : (
          repoKeys.map((repoKey) => {
            const files = overrides[repoKey] ?? {};
            return (
              <div key={repoKey} style={styles.repoGroup}>
                <p style={styles.repoKey}>{repoKey}</p>
                {Object.keys(files)
                  .sort()
                  .map((filename) => (
                    <div key={filename} style={styles.overrideRow}>
                      <span style={styles.filename}>{filename}</span>
                      <span style={styles.badge}>{files[filename]}</span>
                      <button
                        style={styles.button}
                        onClick={() => onRemoveOverride(repoKey, filename)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
              </div>
            );
          })
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Detection cache</h2>
        <div style={styles.row}>
          <button style={styles.button} onClick={onClearCache}>
            {cacheCleared ? "Cleared" : "Clear detection cache"}
          </button>
        </div>
        <p style={styles.helper}>
          Forces re-detection of which workflows are reusable on next page load.
        </p>
      </section>
    </div>
  );
}
