import { beforeEach, describe, expect, it } from "vitest";
import {
  isActionsPage,
  parseRepo,
  parseSidebarWorkflows,
  parseWorkflowHref,
  setDimmed,
  setHidden,
} from "@/lib/dom";

const SIDEBAR_HTML = `
<ul class="ActionList">
  <li class="entry"><a href="/octocat/hello-world/actions/workflows/ci.yml">CI</a></li>
  <li class="entry"><a href="/octocat/hello-world/actions/workflows/release.yaml">Release</a></li>
  <li class="entry"><a href="/octocat/hello-world/actions/workflows/reusable-build.yml">  Reusable Build  </a></li>
  <li class="entry"><a href="/octocat/hello-world/actions/workflows/ci.yml?query=1">CI duplicate</a></li>
  <li class="entry"><a href="/octocat/hello-world/issues">Issues</a></li>
</ul>
`;

function fixture(): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = SIDEBAR_HTML;
  return container;
}

describe("parseWorkflowHref", () => {
  it("parses a relative .yml href", () => {
    expect(
      parseWorkflowHref("/octocat/hello-world/actions/workflows/ci.yml"),
    ).toEqual({
      owner: "octocat",
      repo: "hello-world",
      filename: "ci.yml",
      managed: false,
    });
  });

  it("parses a relative .yaml href", () => {
    expect(
      parseWorkflowHref("/octocat/hello-world/actions/workflows/release.yaml"),
    ).toEqual({
      owner: "octocat",
      repo: "hello-world",
      filename: "release.yaml",
      managed: false,
    });
  });

  it("parses an absolute href", () => {
    expect(
      parseWorkflowHref(
        "https://github.com/octocat/hello-world/actions/workflows/ci.yml",
      ),
    ).toEqual({
      owner: "octocat",
      repo: "hello-world",
      filename: "ci.yml",
      managed: false,
    });
  });

  it("ignores query and hash", () => {
    expect(
      parseWorkflowHref(
        "/octocat/hello-world/actions/workflows/ci.yml?query=1#frag",
      ),
    ).toEqual({
      owner: "octocat",
      repo: "hello-world",
      filename: "ci.yml",
      managed: false,
    });
  });

  it("parses a slug-path managed workflow as managed", () => {
    expect(
      parseWorkflowHref(
        "/babel/babel/actions/workflows/copilot-pull-request-reviewer/copilot-pull-request-reviewer",
      ),
    ).toEqual({
      owner: "babel",
      repo: "babel",
      filename: "copilot-pull-request-reviewer/copilot-pull-request-reviewer",
      managed: true,
    });
  });

  it("parses a single-segment slug workflow as managed", () => {
    expect(
      parseWorkflowHref("/octocat/hello-world/actions/workflows/dependabot"),
    ).toEqual({
      owner: "octocat",
      repo: "hello-world",
      filename: "dependabot",
      managed: true,
    });
  });

  it("returns null for a non-workflow href", () => {
    expect(parseWorkflowHref("/octocat/hello-world/issues")).toBeNull();
  });

  it("returns null for a workflow path without a yaml extension", () => {
    expect(
      parseWorkflowHref("/octocat/hello-world/actions/workflows/ci.txt"),
    ).toBeNull();
  });

  it("returns null for a workflow run URL with a trailing segment", () => {
    expect(
      parseWorkflowHref("/octocat/hello-world/actions/workflows/ci.yml/123"),
    ).toBeNull();
  });
});

describe("parseRepo", () => {
  it("extracts owner and repo from a repo path", () => {
    expect(parseRepo("/octocat/hello-world/actions")).toEqual({
      owner: "octocat",
      repo: "hello-world",
    });
  });

  it("extracts owner and repo from a bare repo path", () => {
    expect(parseRepo("/octocat/hello-world")).toEqual({
      owner: "octocat",
      repo: "hello-world",
    });
  });

  it("returns null for a single-segment path", () => {
    expect(parseRepo("/octocat")).toBeNull();
  });

  it("returns null for the root path", () => {
    expect(parseRepo("/")).toBeNull();
  });
});

describe("isActionsPage", () => {
  it("is true for the actions root", () => {
    expect(isActionsPage("/octocat/hello-world/actions")).toBe(true);
  });

  it("is true for a deeper actions path", () => {
    expect(isActionsPage("/octocat/hello-world/actions/workflows/ci.yml")).toBe(
      true,
    );
  });

  it("is false for a non-actions repo path", () => {
    expect(isActionsPage("/octocat/hello-world/issues")).toBe(false);
  });

  it("is false for a bare repo path", () => {
    expect(isActionsPage("/octocat/hello-world")).toBe(false);
  });
});

describe("parseSidebarWorkflows", () => {
  it("returns the workflow entries with trimmed names and filenames", () => {
    const workflows = parseSidebarWorkflows(fixture());
    expect(workflows.map((w) => w.filename)).toEqual([
      "ci.yml",
      "release.yaml",
      "reusable-build.yml",
    ]);
    expect(workflows.map((w) => w.name)).toEqual([
      "CI",
      "Release",
      "Reusable Build",
    ]);
  });

  it("ignores non-workflow links", () => {
    const workflows = parseSidebarWorkflows(fixture());
    expect(workflows.some((w) => w.name === "Issues")).toBe(false);
  });

  it("dedupes by filename", () => {
    const workflows = parseSidebarWorkflows(fixture());
    expect(workflows.filter((w) => w.filename === "ci.yml")).toHaveLength(1);
  });

  it("uses the closest li ancestor as the element", () => {
    const workflows = parseSidebarWorkflows(fixture());
    expect(workflows[0]?.element.tagName).toBe("LI");
  });

  it("falls back to the anchor when there is no li ancestor", () => {
    const container = document.createElement("div");
    container.innerHTML =
      '<a href="/octocat/hello-world/actions/workflows/ci.yml">CI</a>';
    const workflows = parseSidebarWorkflows(container);
    expect(workflows[0]?.element.tagName).toBe("A");
  });
});

describe("setHidden", () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement("li");
  });

  it("hides an element", () => {
    setHidden(element, true);
    expect(element.style.display).toBe("none");
    expect(element.dataset.wveHidden).toBe("true");
  });

  it("un-hides a previously hidden element", () => {
    setHidden(element, true);
    setHidden(element, false);
    expect(element.style.display).toBe("");
    expect(element.dataset.wveHidden).toBeUndefined();
  });

  it("is idempotent when hiding twice", () => {
    setHidden(element, true);
    setHidden(element, true);
    expect(element.style.display).toBe("none");
    expect(element.dataset.wveHidden).toBe("true");
  });

  it("restores a pre-existing inline display value on un-hide", () => {
    element.style.display = "flex";
    setHidden(element, true);
    expect(element.style.display).toBe("none");
    setHidden(element, false);
    expect(element.style.display).toBe("flex");
  });
});

describe("setDimmed", () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement("li");
  });

  it("dims an element", () => {
    setDimmed(element, true);
    expect(element.style.opacity).toBe("0.35");
    expect(element.dataset.wveDimmed).toBe("true");
  });

  it("restores a previously dimmed element", () => {
    setDimmed(element, true);
    setDimmed(element, false);
    expect(element.style.opacity).toBe("");
    expect(element.dataset.wveDimmed).toBeUndefined();
  });

  it("is idempotent when dimming twice", () => {
    setDimmed(element, true);
    setDimmed(element, true);
    expect(element.style.opacity).toBe("0.35");
    expect(element.dataset.wveDimmed).toBe("true");
  });

  it("is a no-op when un-dimming an element that is not dimmed", () => {
    element.style.opacity = "0.5";
    setDimmed(element, false);
    expect(element.style.opacity).toBe("0.5");
  });

  it("restores a pre-existing inline opacity value on un-dim", () => {
    element.style.opacity = "0.5";
    setDimmed(element, true);
    expect(element.style.opacity).toBe("0.35");
    setDimmed(element, false);
    expect(element.style.opacity).toBe("0.5");
  });
});
