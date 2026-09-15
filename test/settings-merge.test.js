import { test } from "node:test";
import assert from "node:assert/strict";

const { addClaudeHooks, PRE_TOOL_COMMAND, STOP_COMMAND } = await import(
  "../src/settings-merge.js"
);

test("adds PreToolUse and Stop hooks to empty settings", () => {
  const out = addClaudeHooks({});
  assert.ok(Array.isArray(out.hooks.PreToolUse));
  assert.ok(Array.isArray(out.hooks.Stop));
  assert.ok(
    out.hooks.PreToolUse.some(
      (e) => e.matcher === "Bash" && e.hooks.some((h) => h.command === PRE_TOOL_COMMAND),
    ),
  );
  assert.ok(out.hooks.Stop.some((e) => e.hooks.some((h) => h.command === STOP_COMMAND)));
});

test("is idempotent: second run produces identical settings", () => {
  const once = addClaudeHooks({});
  const twice = addClaudeHooks(once);
  assert.deepEqual(twice, once);
  const preCount = twice.hooks.PreToolUse.filter((e) =>
    e.hooks.some((h) => h.command === PRE_TOOL_COMMAND),
  ).length;
  const stopCount = twice.hooks.Stop.filter((e) =>
    e.hooks.some((h) => h.command === STOP_COMMAND),
  ).length;
  assert.equal(preCount, 1);
  assert.equal(stopCount, 1);
});

test("preserves existing hook entries", () => {
  const existing = {
    hooks: {
      PreToolUse: [
        { matcher: "Read", hooks: [{ type: "command", command: "echo hi" }] },
      ],
      Stop: [{ hooks: [{ type: "command", command: "echo bye" }] }],
    },
  };
  const out = addClaudeHooks(existing);
  assert.deepEqual(
    out.hooks.PreToolUse.find((e) => e.matcher === "Read"),
    existing.hooks.PreToolUse[0],
  );
  assert.deepEqual(out.hooks.Stop.find((e) => e.hooks[0].command === "echo bye"), {
    hooks: [{ type: "command", command: "echo bye" }],
  });
  assert.equal(
    out.hooks.PreToolUse.filter((e) => e.hooks?.[0]?.command === PRE_TOOL_COMMAND).length,
    1,
  );
});

test("does not mutate the input object", () => {
  const input = { someKey: 1 };
  const out = addClaudeHooks(input);
  assert.ok(!("hooks" in input));
  assert.ok("hooks" in out);
});