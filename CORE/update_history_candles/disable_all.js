// ==========================================
// set last value of every pair line in settings_copy.yaml to false
// ===============import=====================
import fsp from "node:fs/promises";

// ===============config=====================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "disable_all";
// ==========================================
const TARGET_FILE = "CORE/update_history_candles/settings_copy.yaml";
const LAST_VALUE = "false";
// ==========================================
const ENCODING = "utf8";

// ===============logic======================
async function disable_all() {
  const startTime = SHOW_EXECUTION_TIME ? performance.now() : 0;

  const text = await fsp.readFile(TARGET_FILE, ENCODING);
  const updated = text.replace(/^(\s*-\s.*),.*$/gm, `$1,${LAST_VALUE}`);

  if (updated !== text) await fsp.writeFile(TARGET_FILE, updated, ENCODING);

  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`);
}

// ===============export=====================
export { disable_all };

// ===============run========================
if (process.argv[1] === import.meta.filename) disable_all();
