export const PRE_TOOL_COMMAND =
  "node node_modules/agent-shell-breadcrumbs/bin/breadcrumbs.js hook pretool";
export const STOP_COMMAND =
  "node node_modules/agent-shell-breadcrumbs/bin/breadcrumbs.js hook stop";

export function addClaudeHooks(settings) {
  const next = { ...settings };
  const hooks = { ...(next.hooks || {}) };

  const preEntry = { matcher: "Bash", hooks: [{ type: "command", command: PRE_TOOL_COMMAND }] };
  const preList = hooks.PreToolUse || [];
  if (!preList.some((e) => e?.hooks?.some((h) => h?.command === PRE_TOOL_COMMAND))) {
    hooks.PreToolUse = [...preList, preEntry];
  }

  const stopEntry = { hooks: [{ type: "command", command: STOP_COMMAND }] };
  const stopList = hooks.Stop || [];
  if (!stopList.some((e) => e?.hooks?.some((h) => h?.command === STOP_COMMAND))) {
    hooks.Stop = [...stopList, stopEntry];
  }

  next.hooks = hooks;
  return next;
}