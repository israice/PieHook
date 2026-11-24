
// ==========================================
// update session duration in dashboard
// ===============import=====================
import { readFile, writeFile } from "node:fs/promises";

// ===============config=====================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "My custom comment";
// ==========================================
const SESSION_FILE = "CORE/before_start/create_session_start_time.yaml";
const DASHBOARD_FILE = "THE_DASHBOARD.yaml";
const SESSION_START_TIME_KEY = "SESSION_START_TIME";
const HOW_LONG_SESSION_WORKS_KEY = "HOW_LONG_SESSION_WORKS";
const ENCODING = "utf8";

// ===============logic======================
async function update_session_time() {
  const startTime = SHOW_EXECUTION_TIME ? performance.now() : 0;

  const [session, dashboard] = await Promise.all([
    readFile(SESSION_FILE, ENCODING),
    readFile(DASHBOARD_FILE, ENCODING),
  ]);

  // create_session_start_time writes UTC, so parse it as UTC
  const value = session.match(new RegExp(`^${SESSION_START_TIME_KEY}:\\s*(.+)$`, "m"))?.[1]?.trim();
  const start = value && new Date(`${value.replace(" ", "T")}Z`);
  if (!start || isNaN(start)) throw new Error(`Invalid ${SESSION_START_TIME_KEY}`);

  const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const p = n => String(n).padStart(2, "0");

  // shortcut: month = 30 days, year = 12 months; switch to calendar math if exact dates matter
  const date = [
    String(Math.floor(seconds / 31104000)).padStart(4, "0"),
    p(Math.floor(seconds / 2592000) % 12),
    p(Math.floor(seconds / 86400) % 30),
  ];
  const time = [
    p(Math.floor(seconds / 3600) % 24),
    p(Math.floor(seconds / 60) % 60),
    p(seconds % 60),
  ];

  // units appear only when needed: seconds -> minutes -> hours -> days -> months -> years
  while (date.length && Number(date[0]) === 0) date.shift();
  while (time.length > 1 && Number(time[0]) === 0) time.shift();

  const duration = date.length ? `${date.join("-")} ${time.join(":")}` : time.join(":");

  if (!dashboard.includes(`${HOW_LONG_SESSION_WORKS_KEY}:`)) throw new Error(`${HOW_LONG_SESSION_WORKS_KEY} not found in ${DASHBOARD_FILE}`);
  await writeFile(DASHBOARD_FILE, dashboard.replace(new RegExp(`^(${HOW_LONG_SESSION_WORKS_KEY}:\\s*).*$`, "m"), `$1${duration}`), ENCODING);

  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`);
}

// ===============export=====================
export { update_session_time };

// ===============run========================
if (process.argv[1] === import.meta.filename) update_session_time();
