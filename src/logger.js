import { mkdirSync, openSync, closeSync, writeSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { logFile } from "./config.js";

let fd = null;

function openFd() {
  if (fd !== null) return fd;
  mkdirSync(dirname(logFile()), { recursive: true });
  fd = openSync(logFile(), "a");
  return fd;
}

export function writeRecord(record) {
  const line =
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ...record,
    }) + "\n";
  try {
    writeSync(openFd(), line);
  } catch (err) {
    console.error(`[breadcrumbs] failed to write log: ${err.message}`);
  }
}

export function readLog() {
  const path = logFile();
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  const records = [];
  for (const line of raw.split("\n")) {
    if (line.trim() === "") continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      // skip corrupt line
    }
  }
  return records;
}