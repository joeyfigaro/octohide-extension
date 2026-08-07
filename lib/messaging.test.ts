import { beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { requestWorkflowYaml } from "@/lib/messaging";
import {
  FETCH_WORKFLOW_YAML,
  type FetchWorkflowYamlResponse,
  type WorkflowRef,
} from "@/lib/github";

const ref: WorkflowRef = {
  owner: "octocat",
  repo: "hello-world",
  filename: "ci.yml",
};

beforeEach(() => {
  fakeBrowser.reset();
});

describe("requestWorkflowYaml", () => {
  it("posts a well-formed FETCH_WORKFLOW_YAML request and returns the response", async () => {
    const response: FetchWorkflowYamlResponse = {
      ok: true,
      yaml: "on: push\n",
    };
    const send = vi
      .spyOn(browser.runtime, "sendMessage")
      .mockResolvedValue(response as never);

    const result = await requestWorkflowYaml(ref);

    expect(send).toHaveBeenCalledWith({ type: FETCH_WORKFLOW_YAML, ref });
    expect(result).toEqual(response);
  });

  it("returns an error response shape verbatim", async () => {
    const response: FetchWorkflowYamlResponse = { ok: false, status: 404 };
    vi.spyOn(browser.runtime, "sendMessage").mockResolvedValue(
      response as never,
    );

    expect(await requestWorkflowYaml(ref)).toEqual(response);
  });
});
