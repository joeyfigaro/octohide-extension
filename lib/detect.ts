import { parse } from "yaml";

const WORKFLOW_CALL = "workflow_call";

function readOnValue(document: unknown): unknown {
  if (typeof document !== "object" || document === null) return undefined;
  const record = document as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, "on")) return record["on"];
  if (Object.prototype.hasOwnProperty.call(record, "true"))
    return record["true"];
  return undefined;
}

export function parseTriggers(yamlText: string): string[] | null {
  let document: unknown;
  try {
    document = parse(yamlText);
  } catch {
    return null;
  }

  const onValue = readOnValue(document);

  let triggers: string[];
  if (typeof onValue === "string") {
    triggers = [onValue];
  } else if (Array.isArray(onValue)) {
    triggers = onValue.filter(
      (entry): entry is string => typeof entry === "string",
    );
  } else if (typeof onValue === "object" && onValue !== null) {
    triggers = Object.keys(onValue as Record<string, unknown>);
  } else {
    return null;
  }

  return triggers.length > 0 ? triggers : null;
}

export function isReusableOnly(yamlText: string): boolean {
  const triggers = parseTriggers(yamlText);
  return (
    triggers !== null && triggers.length === 1 && triggers[0] === WORKFLOW_CALL
  );
}
