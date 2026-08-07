export interface SidebarWorkflow {
  name: string;
  filename: string;
  href: string;
  element: HTMLElement;
}

const WORKFLOW_HREF =
  /^\/([^/]+)\/([^/]+)\/actions\/workflows\/([^/?#]+\.ya?ml)(?:[?#]|$)/;
const REPO_PATH = /^\/([^/]+)\/([^/]+)(?:\/|$)/;

function pathnameOf(href: string): string {
  try {
    return new URL(href, "https://github.com").pathname;
  } catch {
    return href;
  }
}

export function parseWorkflowHref(
  href: string,
): { owner: string; repo: string; filename: string } | null {
  const match = WORKFLOW_HREF.exec(pathnameOf(href));
  if (!match) return null;
  const [, owner, repo, filename] = match;
  return { owner: owner!, repo: repo!, filename: filename! };
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
    });
  }

  return workflows;
}

export function setHidden(element: HTMLElement, hidden: boolean): void {
  if (hidden) {
    element.dataset.wveHidden = "true";
    element.style.display = "none";
  } else {
    delete element.dataset.wveHidden;
    element.style.display = "";
  }
}
