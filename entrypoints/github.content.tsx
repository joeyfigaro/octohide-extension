import { createRoot, type Root } from "react-dom/client";
import { browser } from "wxt/browser";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { isReusableOnly } from "@/lib/detect";
import {
  isActionsPage,
  parseRepo,
  parseSidebarWorkflows,
  setDimmed,
  setHidden,
  type SidebarWorkflow,
} from "@/lib/dom";
import { EYE_CLOSED_SVG, EYE_SVG } from "@/lib/icons";
import { requestWorkflowYaml } from "@/lib/messaging";
import {
  getCached,
  getRepoOverrides,
  getSettings,
  setCached,
  setOverride,
  type Override,
} from "@/lib/storage";
import { resolveHidden, type Detection } from "@/lib/visibility";

const TTL = 6 * 60 * 60 * 1000;
const DEBOUNCE_MS = 150;

interface Resolved {
  workflow: SidebarWorkflow;
  hidden: boolean;
}

let revealed = false;
let lastResults: Resolved[] = [];

let panelUi: Awaited<
  ReturnType<typeof createShadowRootUi<{ root: Root }>>
> | null = null;
let panelRoot: Root | null = null;

let observer: MutationObserver | null = null;
let scheduled = false;
let running = false;
let rerun = false;

const failedDetections = new Set<string>();

const STYLE_ID = "wve-styles";

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent =
    "[data-wve-toggle]{opacity:0;transition:opacity .1s ease-in-out}" +
    "[data-wve-row]:hover [data-wve-toggle]{opacity:1}" +
    "[data-wve-toggle]:focus-visible{opacity:1}";
  document.head.appendChild(style);
}

function resetRows(): void {
  document
    .querySelectorAll<HTMLElement>('[data-wve-hidden="true"]')
    .forEach((el) => setHidden(el, false));
  document
    .querySelectorAll<HTMLElement>('[data-wve-dimmed="true"]')
    .forEach((el) => setDimmed(el, false));
}

function removeItemControls(): void {
  document.querySelectorAll("[data-wve-toggle]").forEach((el) => el.remove());
}

function hiddenCount(): number {
  return lastResults.filter((r) => r.hidden).length;
}

function applyVisibility(): void {
  for (const { workflow, hidden } of lastResults) {
    setHidden(workflow.element, hidden && !revealed);
    setDimmed(workflow.element, hidden && revealed);
  }
}

function currentlyHidden(filename: string): boolean {
  return (
    lastResults.find((r) => r.workflow.filename === filename)?.hidden ?? false
  );
}

function Panel(props: {
  count: number;
  revealed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        padding: "8px 12px",
        margin: "8px 0",
        fontSize: "12px",
        fontFamily: "-apple-system, system-ui, sans-serif",
        border: "1px solid rgba(128,128,128,0.3)",
        borderRadius: "6px",
      }}
    >
      {props.count < 1 ? (
        <span>No hidden workflows</span>
      ) : (
        <span>
          {props.revealed ? "Showing" : null} {props.count} Hidden Workflows
        </span>
      )}
      {props.count > 0 && (
        <button
          type="button"
          onClick={props.onToggle}
          style={{
            cursor: "pointer",
            fontSize: "12px",
            padding: "2px 8px",
            borderRadius: "6px",
            border: "1px solid rgba(128,128,128,0.4)",
            background: "transparent",
            color: "inherit",
          }}
        >
          {props.revealed ? "Hide" : "Show All"}
        </button>
      )}
    </div>
  );
}

function renderPanel(): void {
  if (!panelRoot) return;
  panelRoot.render(
    <Panel
      count={hiddenCount()}
      revealed={revealed}
      onToggle={() => {
        revealed = !revealed;
        applyVisibility();
        renderPanel();
      }}
    />,
  );
}

async function ensurePanel(
  ctx: ContentScriptContext,
  anchor: Element,
): Promise<void> {
  if (panelUi && !panelUi.shadowHost.isConnected) {
    panelUi.remove();
    panelUi = null;
    panelRoot = null;
  }
  if (!panelUi) {
    panelUi = await createShadowRootUi<{ root: Root }>(ctx, {
      name: "wve-panel",
      position: "inline",
      anchor,
      append: "after",
      onMount(container) {
        const root = createRoot(container);
        panelRoot = root;
        return { root };
      },
      onRemove(mounted) {
        mounted?.root.unmount();
        panelRoot = null;
      },
    });
    panelUi.mount();
  }
  renderPanel();
}

function removePanel(): void {
  panelUi?.remove();
  panelUi = null;
  panelRoot = null;
}

function isPinned(host: HTMLElement): boolean {
  return host.querySelector('[aria-label^="Unpin" i]') !== null;
}

function injectItemControls(
  ctx: ContentScriptContext,
  repoKey: string,
  workflows: SidebarWorkflow[],
): void {
  for (const workflow of workflows) {
    const host = workflow.element;

    if (isPinned(host)) {
      host.querySelector("[data-wve-toggle]")?.remove();
      delete host.dataset.wveRow;
      continue;
    }

    host.dataset.wveRow = "true";
    if (getComputedStyle(host).position === "static") {
      host.style.position = "relative";
    }

    let button = host.querySelector<HTMLButtonElement>("[data-wve-toggle]");
    if (!button) {
      button = document.createElement("button");
      button.dataset.wveToggle = "true";
      button.type = "button";
      Object.assign(button.style, {
        position: "absolute",
        top: "50%",
        right: "8px",
        transform: "translateY(-50%)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px",
        lineHeight: "1",
        cursor: "pointer",
        border: "1px solid rgba(128,128,128,0.4)",
        borderRadius: "6px",
        background: "transparent",
        color: "inherit",
        zIndex: "2",
      });

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const next: Override = currentlyHidden(workflow.filename)
          ? "show"
          : "hide";
        void setOverride(repoKey, workflow.filename, next).then(() =>
          schedule(ctx),
        );
      });

      host.appendChild(button);
    }

    const hidden = currentlyHidden(workflow.filename);
    const state = String(hidden);
    if (button.dataset.wveState !== state) {
      button.dataset.wveState = state;
      button.innerHTML = hidden ? EYE_SVG : EYE_CLOSED_SVG;
      button.title = hidden ? "Show workflow" : "Hide workflow";
    }
  }
}

async function resolveDetection(
  repoKey: string,
  owner: string,
  repo: string,
  filename: string,
): Promise<Detection> {
  const cached = await getCached(repoKey, filename, TTL);
  if (cached !== null) return cached;
  const failKey = `${repoKey}::${filename}`;
  if (failedDetections.has(failKey)) return null;
  try {
    const response = await requestWorkflowYaml({ owner, repo, filename });
    if (response.ok && response.yaml != null) {
      const reusableOnly = isReusableOnly(response.yaml);
      await setCached(repoKey, filename, reusableOnly);
      return reusableOnly;
    }
  } catch {
    failedDetections.add(failKey);
    return null;
  }
  failedDetections.add(failKey);
  return null;
}

function observeList(ctx: ContentScriptContext, container: Element): void {
  observer?.disconnect();
  observer = new MutationObserver(() => schedule(ctx));
  observer.observe(container, { childList: true, subtree: true });
}

async function orchestrate(ctx: ContentScriptContext): Promise<void> {
  if (!isActionsPage(location.pathname)) {
    resetRows();
    removeItemControls();
    observer?.disconnect();
    removePanel();
    lastResults = [];
    return;
  }

  const settings = await getSettings();
  if (!settings.enabled) {
    resetRows();
    removeItemControls();
    observer?.disconnect();
    removePanel();
    lastResults = [];
    return;
  }

  const repo = parseRepo(location.pathname);
  if (!repo) return;
  const repoKey = `${repo.owner}/${repo.repo}`;

  const workflows = parseSidebarWorkflows(document);
  if (workflows.length === 0) return;

  const overrides = await getRepoOverrides(repoKey);

  lastResults = await Promise.all(
    workflows.map(async (workflow): Promise<Resolved> => {
      const override = overrides[workflow.filename] ?? null;
      let detection: Detection = null;
      if (!override && !workflow.managed) {
        detection = await resolveDetection(
          repoKey,
          repo.owner,
          repo.repo,
          workflow.filename,
        );
      }
      return { workflow, hidden: resolveHidden(override, detection) };
    }),
  );

  ensureStyles();
  applyVisibility();
  injectItemControls(ctx, repoKey, workflows);

  const listContainer = workflows[0]?.element.parentElement ?? null;
  if (listContainer) {
    await ensurePanel(ctx, listContainer);
    observeList(ctx, listContainer);
  }
  renderPanel();
}

async function run(ctx: ContentScriptContext): Promise<void> {
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  try {
    await orchestrate(ctx);
  } catch (err) {
    console.debug("[wve] orchestrate failed", err);
  } finally {
    running = false;
  }
  if (rerun) {
    rerun = false;
    void run(ctx);
  }
}

function schedule(ctx: ContentScriptContext): void {
  if (scheduled) return;
  scheduled = true;
  ctx.setTimeout(() => {
    scheduled = false;
    void run(ctx);
  }, DEBOUNCE_MS);
}

export default defineContentScript({
  matches: ["https://github.com/*"],
  main(ctx) {
    const trigger = () => schedule(ctx);

    for (const name of ["turbo:load", "turbo:render"]) {
      document.addEventListener(name, trigger);
      ctx.onInvalidated(() => document.removeEventListener(name, trigger));
    }
    window.addEventListener("popstate", trigger);
    ctx.onInvalidated(() => window.removeEventListener("popstate", trigger));

    const onStorageChanged = () => {
      failedDetections.clear();
      schedule(ctx);
    };
    browser.storage.onChanged.addListener(onStorageChanged);
    ctx.onInvalidated(() =>
      browser.storage.onChanged.removeListener(onStorageChanged),
    );

    ctx.onInvalidated(() => {
      observer?.disconnect();
      removePanel();
    });

    void run(ctx);
  },
});
