import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "breadcrumbs-log-"));
process.env.BREADCRUMBS_LOG_DIR = dir;

const { writeRecord, readLog } = await import("../src/logger.js");
const { buildReport, writeReport } = await import("../src/report.js");
const { logFile, reportsDir } = await import("../src/config.js");

test.after(() => rmSync(dir, { recursive: true, force: true }));

test("writeRecord appends valid JSONL and readLog round-trips", () => {
  writeRecord({ agent: "opencode", tool: "bash", command: "npm run build", cwd: "/p", sessionId: "s1" });
  writeRecord({ agent: "claude-code", tool: "Bash", command: "git status", cwd: "/p", sessionId: "s1" });
  const raw = readFileSync(logFile(), "utf8").trim().split("\n");
  assert.equal(raw.length, 2);
  const records = readLog();
  assert.equal(records.length, 2);
  assert.equal(records[0].command, "npm run build");
  assert.equal(records[1].agent, "claude-code");
  assert.ok(!Number.isNaN(Date.parse(records[0].timestamp)));
});

test("readLog returns [] on missing file", async () => {
  const empty = mkdtempSync(join(tmpdir(), "breadcrumbs-empty-"));
  const before = process.env.BREADCRUMBS_LOG_DIR;
  process.env.BREADCRUMBS_LOG_DIR = empty;
  try {
    const records = (await import("../src/logger.js")).readLog();
    assert.deepEqual(records, []);
  } finally {
    process.env.BREADCRUMBS_LOG_DIR = before;
    rmSync(empty, { recursive: true, force: true });
  }
});

test("buildReport summarizes counts and lists commands", () => {
  const records = [
    { timestamp: "2026-09-15T10:00:00.000Z", agent: "opencode", tool: "bash", command: "a", cwd: "/p", sessionId: "s1" },
    { timestamp: "2026-09-15T10:00:01.000Z", agent: "opencode", tool: "bash", command: "b", cwd: "/p", sessionId: "s2" },
    { timestamp: "2026-09-15T10:00:02.000Z", agent: "claude-code", tool: "Bash", command: "c", cwd: "/p", sessionId: "s1" },
  ];
  const all = buildReport(records);
  assert.ok(all.includes("Commands: 3"));
  assert.ok(all.includes("opencode: 2"));
  assert.ok(all.includes("claude-code: 1"));
  assert.ok(all.includes("`b`"));
  const one = buildReport(records, "s1");
  assert.ok(one.includes("Commands: 2"));
  assert.ok(!one.includes("`b`"));
});

test("buildReport handles empty input", () => {
  assert.ok(buildReport([]).includes("Commands: 0"));
});

test("writeReport writes a dated file and filters by session", () => {
  const records = [
    { timestamp: "2026-09-15T10:00:00.000Z", agent: "opencode", tool: "bash", command: "x", cwd: "/p", sessionId: "abc" },
    { timestamp: "2026-09-15T10:00:01.000Z", agent: "opencode", tool: "bash", command: "y", cwd: "/p", sessionId: "def" },
  ];
  const path = writeReport(records, "abc");
  assert.ok(existsSync(path));
  assert.ok(path.includes("abc"));
  const body = readFileSync(path, "utf8");
  assert.ok(body.includes("Commands: 1"));
  assert.ok(!body.includes("`y`"));
  assert.ok(path.includes(reportsDir()));
});