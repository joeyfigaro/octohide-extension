import { browser } from "wxt/browser";
import {
  FETCH_WORKFLOW_YAML,
  rawWorkflowUrl,
  type FetchWorkflowYamlRequest,
  type FetchWorkflowYamlResponse,
  type WorkflowRef,
} from "@/lib/github";
import { getSettings } from "@/lib/storage";

function isFetchRequest(message: unknown): message is FetchWorkflowYamlRequest {
  return (
    typeof message === "object" &&
    message !== null &&
    (message as { type?: unknown }).type === FETCH_WORKFLOW_YAML
  );
}

async function fetchViaApi(
  ref: WorkflowRef,
  pat: string,
): Promise<FetchWorkflowYamlResponse> {
  const owner = encodeURIComponent(ref.owner);
  const repo = encodeURIComponent(ref.repo);
  const filename = encodeURIComponent(ref.filename);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/.github/workflows/${filename}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: "application/vnd.github.raw+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (res.ok) return { ok: true, yaml: await res.text() };
  return { ok: false, status: res.status };
}

async function fetchWorkflowYaml(
  ref: WorkflowRef,
): Promise<FetchWorkflowYamlResponse> {
  try {
    const res = await fetch(rawWorkflowUrl(ref), { credentials: "include" });
    if (res.ok) return { ok: true, yaml: await res.text() };

    const { pat } = await getSettings();
    if (pat) return await fetchViaApi(ref, pat);

    return { ok: false, status: res.status };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message) => {
    if (isFetchRequest(message)) {
      return fetchWorkflowYaml(message.ref);
    }
    return undefined;
  });
});
