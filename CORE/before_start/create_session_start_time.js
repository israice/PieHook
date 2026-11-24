
// ==========================================
// write session start time to dashboard
// ===============import=====================
import { readFile, writeFile } from "node:fs/promises";

// ===============config=====================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "create_session_start_time";
const SOURCE_FILE = "./create_session_start_time.yaml";
const SESSION_START_TIME_KEY = "SESSION_START_TIME"; // YAML key name

// ===============logic======================
const DASHBOARD_FILE = new URL(`./${SOURCE_FILE}`, import.meta.url);

async function create_session_start_time() {
  const start = performance.now();
  let dashboard = await readFile(DASHBOARD_FILE, "utf8");

  if (!dashboard.includes(`${SESSION_START_TIME_KEY}:`)) {
    throw new Error(`${SESSION_START_TIME_KEY} not found in ${SOURCE_FILE}`);
  }

  dashboard = dashboard.replace(
    new RegExp(`^${SESSION_START_TIME_KEY}:.*$`, "m"),
    `${SESSION_START_TIME_KEY}: ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
  );

  await writeFile(DASHBOARD_FILE, dashboard, "utf8");

  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((performance.now() - start) / 1000).toFixed(3)} sec`);
}

// ===============export=====================
export { create_session_start_time };
// ===============run========================
if (process.argv[1] === import.meta.filename) create_session_start_time();
