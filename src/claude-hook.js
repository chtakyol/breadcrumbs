import { writeRecord, readLog } from "./logger.js";
import { writeReport } from "./report.js";
import { AGENT_CLAUDE } from "./config.js";

async function readStdinJson() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function handlePreToolUse() {
  const input = await readStdinJson();
  if (input.hook_event_name !== "PreToolUse") return;
  const tool = input.tool_name;
  if (tool !== "Bash") return;
  const command = input.tool_input?.command;
  if (typeof command !== "string" || command === "") return;
  writeRecord({
    agent: AGENT_CLAUDE,
    tool,
    command,
    cwd: input.cwd,
    sessionId: input.session_id,
  });
}

export async function handleStop() {
  const input = await readStdinJson();
  if (input.hook_event_name !== "Stop") return;
  try {
    writeReport(readLog(), input.session_id);
  } catch (err) {
    console.error(`[breadcrumbs] failed to write report: ${err.message}`);
  }
}