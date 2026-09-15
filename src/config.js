import { join } from "node:path";

export const AGENT_CLAUDE = "claude-code";
export const AGENT_OPENCODE = "opencode";

export function logDir() {
  return process.env.BREADCRUMBS_LOG_DIR || join(process.cwd(), ".breadcrumbs");
}

export function logFile() {
  return join(logDir(), "log.jsonl");
}

export function reportsDir() {
  return join(logDir(), "reports");
}