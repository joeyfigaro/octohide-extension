export interface WorkflowRef {
  owner: string;
  repo: string;
  filename: string;
}

export function rawWorkflowUrl(ref: WorkflowRef): string {
  const owner = encodeURIComponent(ref.owner);
  const repo = encodeURIComponent(ref.repo);
  const filename = encodeURIComponent(ref.filename);
  return `https://github.com/${owner}/${repo}/raw/HEAD/.github/workflows/${filename}`;
}

export const FETCH_WORKFLOW_YAML = "fetchWorkflowYaml" as const;

export interface FetchWorkflowYamlRequest {
  type: typeof FETCH_WORKFLOW_YAML;
  ref: WorkflowRef;
}

export interface FetchWorkflowYamlResponse {
  ok: boolean;
  yaml?: string;
  status?: number;
  error?: string;
}
