import { createRoot, type Root } from "react-dom/client";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { isReusableOnly } from "@/lib/detect";
import {
  isActionsPage,
  parseRepo,
  parseSidebarWorkflows,
  setHidden,
  type SidebarWorkflow,
} from "@/lib/dom";
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

function unhideAll(): void {
  document
    .querySelectorAll<HTMLElement>('[data-wve-hidden="true"]')
    .forEach((el) => setHidden(el, false));
}

function hiddenCount(): number {
  return lastResults.filter((r) => r.hidden).length;
}

function applyVisibility(): void {
  for (const { workflow, hidden } of lastResults) {
    setHidden(workflow.element, hidden && !revealed);
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
      <span>Hidden ({props.count})</span>
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
        {props.revealed ? "Hide again" : "Show hidden"}
      </button>
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

function injectItemControls(
  ctx: ContentScriptContext,
  repoKey: string,
  workflows: SidebarWorkflow[],
): void {
  for (const workflow of workflows) {
    const host = workflow.element;
    if (host.querySelector("[data-wve-toggle]")) continue;

    const button = document.createElement("button");
    button.dataset.wveToggle = "true";
    button.type = "button";
    button.textContent = "⋯";
    button.title = "Toggle visibility (Workflow Visibility)";
    Object.assign(button.style, {
      marginLeft: "6px",
      padding: "0 4px",
      fontSize: "11px",
      lineHeight: "1",
      cursor: "pointer",
      border: "1px solid rgba(128,128,128,0.4)",
      borderRadius: "6px",
      background: "transparent",
      color: "inherit",
      opacity: "0.6",
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
}

async function resolveDetection(
  repoKey: string,
  owner: string,
  repo: string,
  filename: string,
): Promise<Detection> {
  const cached = await getCached(repoKey, filename, TTL);
  if (cached !== null) return cached;
  try {
    const response = await requestWorkflowYaml({ owner, repo, filename });
    if (response.ok && response.yaml != null) {
      const reusableOnly = isReusableOnly(response.yaml);
      await setCached(repoKey, filename, reusableOnly);
      return reusableOnly;
    }
  } catch {
    return null;
  }
  return null;
}

function observeList(ctx: ContentScriptContext, container: Element): void {
  observer?.disconnect();
  observer = new MutationObserver(() => schedule(ctx));
  observer.observe(container, { childList: true, subtree: true });
}

async function orchestrate(ctx: ContentScriptContext): Promise<void> {
  if (!isActionsPage(location.pathname)) {
    unhideAll();
    observer?.disconnect();
    removePanel();
    lastResults = [];
    return;
  }

  const settings = await getSettings();
  if (!settings.enabled) {
    unhideAll();
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
      if (!override) {
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
  } catch {
    // fail soft: if selectors miss or storage errors, leave the page untouched
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
    ctx.onInvalidated(() => {
      observer?.disconnect();
      removePanel();
    });

    void run(ctx);
  },
});
