import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { reportsDir } from "./config.js";

function fmtTimestamp(iso) {
  return iso.replace(/[:.]/g, "-").slice(0, 19);
}

export function buildReport(records, sessionId) {
  const filtered = sessionId
    ? records.filter((r) => r.sessionId === sessionId)
    : records;

  const counts = {};
  for (const r of filtered) counts[r.agent] = (counts[r.agent] || 0) + 1;

  const lines = [];
  lines.push(`# Breadcrumbs report`);
  lines.push("");
  lines.push(`- Commands: ${filtered.length}`);
  lines.push(`- By agent:`);
  for (const [agent, n] of Object.entries(counts)) {
    lines.push(`  - ${agent}: ${n}`);
  }
  lines.push("");
  lines.push("## Commands");
  lines.push("");
  for (const r of filtered) {
    lines.push(`- \`${r.command}\``);
    lines.push(`  - ${r.timestamp} · ${r.agent} · ${r.cwd}`);
  }
  return lines.join("\n") + "\n";
}

export function writeReport(records, sessionId) {
  const markdown = buildReport(records, sessionId);
  const dir = reportsDir();
  mkdirSync(dir, { recursive: true });
  const stamp = fmtTimestamp(new Date().toISOString());
  const path = join(
    dir,
    sessionId ? `${stamp}-${sessionId}.md` : `${stamp}.md`,
  );
  writeFileSync(path, markdown);
  return path;
}