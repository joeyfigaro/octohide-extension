export interface SidebarWorkflow {
  name: string;
  filename: string;
  href: string;
  element: HTMLElement;
  managed: boolean;
}

export interface ParsedWorkflow {
  owner: string;
  repo: string;
  filename: string;
  managed: boolean;
}

const WORKFLOW_PREFIX = /^\/([^/]+)\/([^/]+)\/actions\/workflows\/(.+)$/;
const YML_FILE = /^[^/]+\.ya?ml$/;
const SLUG_PATH = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/;
const REPO_PATH = /^\/([^/]+)\/([^/]+)(?:\/|$)/;

function pathnameOf(href: string): string {
  try {
    return new URL(href, "https://github.com").pathname;
  } catch {
    return href;
  }
}

export function parseWorkflowHref(href: string): ParsedWorkflow | null {
  const match = WORKFLOW_PREFIX.exec(pathnameOf(href));
  if (!match) return null;
  const [, owner, repo, rest] = match;
  if (YML_FILE.test(rest!)) {
    return { owner: owner!, repo: repo!, filename: rest!, managed: false };
  }
  if (SLUG_PATH.test(rest!)) {
    return { owner: owner!, repo: repo!, filename: rest!, managed: true };
  }
  return null;
}

export function parseRepo(
  pathname: string,
): { owner: string; repo: string } | null {
  const match = REPO_PATH.exec(pathname);
  if (!match) return null;
  const [, owner, repo] = match;
  return { owner: owner!, repo: repo! };
}

export function isActionsPage(pathname: string): boolean {
  return /^\/[^/]+\/[^/]+\/actions(?:\/|$)/.test(pathname);
}

export function parseSidebarWorkflows(root: ParentNode): SidebarWorkflow[] {
  const anchors = root.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/actions/workflows/"]',
  );
  const seen = new Set<string>();
  const workflows: SidebarWorkflow[] = [];

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href");
    if (!href) continue;
    const parsed = parseWorkflowHref(href);
    if (!parsed) continue;
    if (seen.has(parsed.filename)) continue;
    seen.add(parsed.filename);

    const element = anchor.closest("li") ?? anchor;
    workflows.push({
      name: (anchor.textContent ?? "").trim(),
      filename: parsed.filename,
      href,
      element,
      managed: parsed.managed,
    });
  }

  return workflows;
}

export function setHidden(element: HTMLElement, hidden: boolean): void {
  if (hidden) {
    if (element.dataset.wveHidden === "true") return;
    element.dataset.wvePrevDisplay = element.style.display;
    element.dataset.wveHidden = "true";
    element.style.display = "none";
  } else {
    if (element.dataset.wveHidden !== "true") return;
    element.style.display = element.dataset.wvePrevDisplay ?? "";
    delete element.dataset.wvePrevDisplay;
    delete element.dataset.wveHidden;
  }
}

export function setDimmed(element: HTMLElement, dimmed: boolean): void {
  if (dimmed) {
    if (element.dataset.wveDimmed === "true") return;
    element.dataset.wvePrevOpacity = element.style.opacity;
    element.dataset.wveDimmed = "true";
    element.style.opacity = "0.35";
  } else {
    if (element.dataset.wveDimmed !== "true") return;
    element.style.opacity = element.dataset.wvePrevOpacity ?? "";
    delete element.dataset.wvePrevOpacity;
    delete element.dataset.wveDimmed;
  }
}
