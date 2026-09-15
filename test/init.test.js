import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const bin = fileURLToPath(new URL("../bin/breadcrumbs.js", import.meta.url));

test("init is idempotent and end-to-end on a fresh repo", () => {
  const repo = mkdtempSync(join(tmpdir(), "breadcrumbs-repo-"));
  try {
    const run = () =>
      spawnSync("node", [bin, "init"], { cwd: repo, encoding: "utf8" });

    const first = run();
    assert.equal(first.status, 0);

    const plugin = readFileSync(join(repo, ".opencode/plugin/breadcrumbs.js"), "utf8");
    assert.ok(plugin.includes("agent-shell-breadcrumbs/opencode"));
    assert.ok(!existsSync(join(repo, ".opencode/plugin/breadcrumbs.mjs")));

    const settings = JSON.parse(readFileSync(join(repo, ".claude/settings.json"), "utf8"));
    assert.equal(settings.hooks.PreToolUse.filter((e) => e.matcher === "Bash").length, 1);
    assert.equal(settings.hooks.Stop.length, 1);

    const gitignore = readFileSync(join(repo, ".gitignore"), "utf8");
    assert.ok(gitignore.includes(".breadcrumbs/"));

    const second = run();
    assert.equal(second.status, 0);
    const settingsAfter = JSON.parse(readFileSync(join(repo, ".claude/settings.json"), "utf8"));
    assert.equal(settingsAfter.hooks.PreToolUse.filter((e) => e.matcher === "Bash").length, 1);
    assert.equal(
      settingsAfter.hooks.PreToolUse.filter((e) => e.hooks?.[0]?.command)
        .flatMap((e) => e.hooks)
        .filter((h) => h.command.includes("hook pretool")).length,
      1,
    );
    assert.equal(settingsAfter.hooks.Stop.length, 1);
    assert.ok(second.stdout.includes("already present"));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("init preserves existing settings and hook entries", async () => {
  const repo = mkdtempSync(join(tmpdir(), "breadcrumbs-repo2-"));
  try {
    const claudeDir = join(repo, ".claude");
    const fs = await import("node:fs");
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(
      join(claudeDir, "settings.json"),
      JSON.stringify({ env: { FOO: "1" }, hooks: { PreToolUse: [{ matcher: "Read", hooks: [{ type: "command", command: "echo x" }] }] } }),
    );

    const r = spawnSync("node", [bin, "init"], { cwd: repo, encoding: "utf8" });
    assert.equal(r.status, 0);

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.json"), "utf8"));
    assert.equal(settings.env.FOO, "1");
    assert.ok(settings.hooks.PreToolUse.some((e) => e.matcher === "Read"));
    assert.ok(settings.hooks.PreToolUse.some((e) => e.matcher === "Bash"));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("init migrates an obsolete .mjs stub to .js", async () => {
  const repo = mkdtempSync(join(tmpdir(), "breadcrumbs-repo3-"));
  try {
    const pluginDir = join(repo, ".opencode", "plugin");
    const fs = await import("node:fs");
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      join(pluginDir, "breadcrumbs.mjs"),
      'import plugin from "agent-shell-breadcrumbs/opencode";\nexport default plugin;\n',
    );

    const legacy = join(pluginDir, "breadcrumbs.mjs");
    assert.ok(existsSync(legacy));

    const r = spawnSync("node", [bin, "init"], { cwd: repo, encoding: "utf8" });
    assert.equal(r.status, 0);

    assert.ok(!existsSync(legacy), "legacy .mjs stub is removed");
    assert.ok(existsSync(join(pluginDir, "breadcrumbs.js")), "new .js stub is written");
    assert.ok(r.stdout.includes("removed obsolete breadcrumbs.mjs"));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});