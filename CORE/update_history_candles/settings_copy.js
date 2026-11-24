// ==========================================
// write pairs x timeframes from THE_SETTINGS.yaml to settings_copy.yaml
// as [pair,timeframe,false] rows, only this key is replaced, other lines stay untouched
// ===============import=====================
import fsp from "node:fs/promises";
import { parse, stringify } from "yaml";

// ===============config=====================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "settings_copy";
// ==========================================
const SETTINGS_FILE = "THE_SETTINGS.yaml";
const TARGET_FILE = "CORE/update_history_candles/settings_copy.yaml";
const PAIRS_KEY = "THE_PAIRS";
const TIMEFRAMES_KEY = "THE_TIMEFRAMES";
const TARGET_KEY = "THE_PAIR_LIST_WITH_TIMEFRAMES";
const LAST_VALUE = "false";
// ==========================================
const ENCODING = "utf8";

// ===============logic======================
async function settings_copy() {
  const startTime = SHOW_EXECUTION_TIME ? performance.now() : 0;

  const settings = parse(await fsp.readFile(SETTINGS_FILE, ENCODING));

  for (const key of [PAIRS_KEY, TIMEFRAMES_KEY]) {
    if (!(key in settings)) throw new Error(`${SETTINGS_FILE}: ${key} not found`);
  }

  const value = settings[PAIRS_KEY].flatMap(pair =>
    settings[TIMEFRAMES_KEY].map(timeframe => `${pair},${timeframe},${LAST_VALUE}`)
  );

  let text = "";
  try {
    text = await fsp.readFile(TARGET_FILE, ENCODING);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const original = text;
  const block = stringify({ [TARGET_KEY]: value }).replace(/\n$/, "");
  // key line at column 0 plus its indented value lines
  const pattern = new RegExp(`^${TARGET_KEY}:[^\\n]*(?:\\n[ \\t]+[^\\n]*)*`, "m");
  const found = text.match(pattern);

  if (!found) {
    text = `${text.trimEnd() ? text.trimEnd() + "\n" : ""}${block}\n`;
  } else if (JSON.stringify(parse(found[0])?.[TARGET_KEY]) !== JSON.stringify(value)) {
    text = text.replace(pattern, () => block);
  }

  if (text !== original) await fsp.writeFile(TARGET_FILE, text, ENCODING);

  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`);
}

// ===============export=====================
export { settings_copy };

// ===============run========================
if (process.argv[1] === import.meta.filename) settings_copy();
