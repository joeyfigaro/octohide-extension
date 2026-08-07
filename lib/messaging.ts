import { browser } from "wxt/browser";
import {
  FETCH_WORKFLOW_YAML,
  type FetchWorkflowYamlRequest,
  type FetchWorkflowYamlResponse,
  type WorkflowRef,
} from "@/lib/github";

export async function requestWorkflowYaml(
  ref: WorkflowRef,
): Promise<FetchWorkflowYamlResponse> {
  const request: FetchWorkflowYamlRequest = { type: FETCH_WORKFLOW_YAML, ref };
  return (await browser.runtime.sendMessage(
    request,
  )) as FetchWorkflowYamlResponse;
}
