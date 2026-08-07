import { describe, expect, it } from "vitest";
import {
  FETCH_WORKFLOW_YAML,
  rawWorkflowUrl,
  type FetchWorkflowYamlRequest,
  type FetchWorkflowYamlResponse,
  type WorkflowRef,
} from "@/lib/github";

describe("rawWorkflowUrl", () => {
  it("builds the expected raw URL for a normal ref", () => {
    const ref: WorkflowRef = {
      owner: "octocat",
      repo: "hello-world",
      filename: "ci.yml",
    };
    expect(rawWorkflowUrl(ref)).toBe(
      "https://github.com/octocat/hello-world/raw/HEAD/.github/workflows/ci.yml",
    );
  });

  it("preserves a plain filename such as deploy.yml", () => {
    const ref: WorkflowRef = {
      owner: "acme",
      repo: "widgets",
      filename: "deploy.yml",
    };
    expect(rawWorkflowUrl(ref)).toBe(
      "https://github.com/acme/widgets/raw/HEAD/.github/workflows/deploy.yml",
    );
  });

  it("encodes owner and repo segments that contain reserved characters", () => {
    const ref: WorkflowRef = {
      owner: "my org",
      repo: "a+b",
      filename: "release build.yml",
    };
    expect(rawWorkflowUrl(ref)).toBe(
      "https://github.com/my%20org/a%2Bb/raw/HEAD/.github/workflows/release%20build.yml",
    );
  });

  it("percent-encodes a slash in the filename to prevent path traversal", () => {
    const ref: WorkflowRef = {
      owner: "octocat",
      repo: "hello-world",
      filename: "../../secret.yml",
    };
    expect(rawWorkflowUrl(ref)).toBe(
      "https://github.com/octocat/hello-world/raw/HEAD/.github/workflows/..%2F..%2Fsecret.yml",
    );
  });
});

describe("message contract", () => {
  it("exposes a stable request type constant", () => {
    expect(FETCH_WORKFLOW_YAML).toBe("fetchWorkflowYaml");
  });

  it("has a request shape carrying the type and ref", () => {
    const request: FetchWorkflowYamlRequest = {
      type: FETCH_WORKFLOW_YAML,
      ref: { owner: "octocat", repo: "hello-world", filename: "ci.yml" },
    };
    expect(request.type).toBe("fetchWorkflowYaml");
    expect(request.ref.filename).toBe("ci.yml");
  });

  it("has a response shape covering success and failure", () => {
    const ok: FetchWorkflowYamlResponse = { ok: true, yaml: "on: push\n" };
    const err: FetchWorkflowYamlResponse = {
      ok: false,
      status: 404,
      error: "not found",
    };
    expect(ok.ok).toBe(true);
    expect(err.ok).toBe(false);
    expect(err.status).toBe(404);
  });
});
