import { writeRecord, readLog } from "./logger.js";
import { writeReport } from "./report.js";
import { AGENT_OPENCODE } from "./config.js";

export default async function breadcrumbsPlugin(ctx) {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool !== "bash") return;
      const args = output.args || {};
      if (typeof args.command !== "string" || args.command === "") return;
      writeRecord({
        agent: AGENT_OPENCODE,
        tool: input.tool,
        command: args.command,
        cwd: args.workdir || ctx.directory,
        sessionId: input.sessionID,
      });
    },
    event: async ({ event }) => {
      if (event?.type !== "session.idle") return;
      try {
        writeReport(readLog(), event.properties?.sessionID);
      } catch (err) {
        console.error(`[breadcrumbs] failed to write report: ${err.message}`);
      }
    },
  };
}