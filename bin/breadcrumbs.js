#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { readLog } from "../src/logger.js";
import { buildReport } from "../src/report.js";
import { addClaudeHooks, PRE_TOOL_COMMAND, STOP_COMMAND } from "../src/settings-merge.js";
import { handlePreToolUse, handleStop } from "../src/claude-hook.js";

const OPENCODE_STUB = `import plugin from "agent-shell-breadcrumbs/opencode";
export default plugin;
`;
const OPENCODE_STUB_LEGACY_MJS = `import plugin from "agent-shell-breadcrumbs/opencode";
export default plugin;
`;

function repoRoot() {
  return process.cwd();
}

function init() {
  const root = repoRoot();
  const done = [];

  const pluginDir = join(root, ".opencode", "plugin");
  const pluginFile = join(pluginDir, "breadcrumbs.js");
  mkdirSync(pluginDir, { recursive: true });

  const legacyFile = join(pluginDir, "breadcrumbs.mjs");
  if (existsSync(legacyFile) && readFileSync(legacyFile, "utf8") === OPENCODE_STUB_LEGACY_MJS) {
    rmSync(legacyFile);
    done.push("opencode plugin: removed obsolete breadcrumbs.mjs");
  }

  if (existsSync(pluginFile) && readFileSync(pluginFile, "utf8") === OPENCODE_STUB) {
    done.push("opencode plugin: already present (skipped)");
  } else {
    writeFileSync(pluginFile, OPENCODE_STUB);
    done.push("opencode plugin: written .opencode/plugin/breadcrumbs.js");
  }

  const settingsFile = join(root, ".claude", "settings.json");
  mkdirSync(join(root, ".claude"), { recursive: true });
  let settings = {};
  if (existsSync(settingsFile)) {
    try {
      settings = JSON.parse(readFileSync(settingsFile, "utf8"));
    } catch (err) {
      console.error(`[breadcrumbs] .claude/settings.json is invalid JSON: ${err.message}`);
      process.exitCode = 1;
      return;
    }
  }
  const merged = addClaudeHooks(settings);
  const hadHooks = settings.hooks && JSON.stringify(settings.hooks) === JSON.stringify(merged.hooks);
  writeFileSync(settingsFile, JSON.stringify(merged, null, 2) + "\n");
  done.push(hadHooks ? "claude settings: hooks already present (merged, unchanged)" : "claude settings: hooks added");

  const gitignoreFile = join(root, ".gitignore");
  const gitignoreEntry = ".breadcrumbs/";
  if (existsSync(gitignoreFile) && readFileSync(gitignoreFile, "utf8").includes(gitignoreEntry)) {
    done.push("gitignore: entry already present (skipped)");
  } else {
    appendFileSync(gitignoreFile, (existsSync(gitignoreFile) ? "\n" : "") + gitignoreEntry + "\n");
    done.push("gitignore: added .breadcrumbs/");
  }

  console.log(done.join("\n"));
  console.log("Restart your agent (Claude Code / OpenCode) for hooks to take effect.");
}

function report(argv) {
  const sessionIdx = argv.indexOf("--session");
  const sessionId =
    sessionIdx >= 0 && argv[sessionIdx + 1] ? argv[sessionIdx + 1] : undefined;
  const records = readLog();
  if (records.length === 0) {
    console.log("No breadcrumbs logged yet.");
    return;
  }
  const markdown =
    buildReport(records, sessionId) +
    (sessionId ? `Filtered to session ${sessionId}.\n` : "");
  process.stdout.write(markdown);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "init":
      init();
      break;
    case "report":
      report(rest);
      break;
    case "hook":
      if (rest[0] === "pretool") await handlePreToolUse();
      else if (rest[0] === "stop") await handleStop();
      else {
        console.error("usage: breadcrumbs hook <pretool|stop>");
        process.exitCode = 1;
      }
      break;
    default:
      console.log(
        "breadcrumbs: record AI agent shell commands\n\n" +
          "  breadcrumbs init                 set up hooks for this repo\n" +
          "  breadcrumbs report [--session]   print a markdown summary of the log",
      );
  }
}

main().catch((err) => {
  console.error(`[breadcrumbs] ${err.message}`);
  process.exitCode = 1;
});