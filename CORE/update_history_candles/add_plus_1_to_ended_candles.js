// ==========================================
// add +1 to candle values (except candle 0) for every [pair,timeframe] marked true in settings_copy.yaml
// ===============import=====================
import fsp from "node:fs/promises";
import { parse } from "yaml";

// ===============config=====================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "add_plus_1_to_ended_candles";
// ==========================================
const SETTINGS_FILE = "CORE/update_history_candles/settings_copy.yaml";
const PAIR_LIST_KEY = "THE_PAIR_LIST_WITH_TIMEFRAMES";
const MARKED_VALUE = "true";
// ==========================================
const HISTORY_CSV = "THE_HISTORY.csv";
const PAIR_KEY = "pair";
const TIMEFRAME_KEY = "timeframe";
const CANDLE_KEY = "candle";
const CANDLE_VALUE = "0";
// ==========================================
const ENCODING = "utf8";
const SEPARATOR = ",";

// ===============logic======================
async function add_plus_1_to_ended_candles() {
  const startTime = SHOW_EXECUTION_TIME ? performance.now() : 0;

  const settings = parse(await fsp.readFile(SETTINGS_FILE, ENCODING));
  const list = settings[PAIR_LIST_KEY];

  if (!Array.isArray(list)) throw new Error(`${SETTINGS_FILE}: ${PAIR_LIST_KEY} not found`);

  // [pair,timeframe,true] -> shift only the marked ones
  const targets = new Set(list
    .map(row => row.split(SEPARATOR).map(value => value.trim()))
    .filter(([, , marked]) => marked === MARKED_VALUE)
    .map(([pair, timeframe]) => [pair, timeframe].join(SEPARATOR)));

  const [header, ...rows] = (await fsp.readFile(HISTORY_CSV, ENCODING)).trim().split(/\r?\n/);
  const columns = header.replace(/^\uFEFF/, "").split(SEPARATOR).map(column => column.trim());

  if ([PAIR_KEY, TIMEFRAME_KEY, CANDLE_KEY].some(key => !columns.includes(key))) {
    throw new Error(`${HISTORY_CSV}: header must contain ${PAIR_KEY}, ${TIMEFRAME_KEY} and ${CANDLE_KEY} columns`);
  }

  const pairIdx = columns.indexOf(PAIR_KEY);
  const timeframeIdx = columns.indexOf(TIMEFRAME_KEY);
  const candleIdx = columns.indexOf(CANDLE_KEY);

  const result = rows.map(line => {
    const values = line.split(SEPARATOR);
    const key = [values[pairIdx], values[timeframeIdx]].map(value => value.trim()).join(SEPARATOR);
    const isTarget = targets.has(key) && values[candleIdx].trim() !== CANDLE_VALUE;

    if (isTarget) values[candleIdx] = String(Number(values[candleIdx]) + 1);

    return values.join(SEPARATOR);
  });

  await fsp.writeFile(HISTORY_CSV, [header, ...result].join("\n") + "\n", ENCODING);

  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`);
}

// ===============export=====================
export { add_plus_1_to_ended_candles };

// ===============run========================
if (process.argv[1] === import.meta.filename) add_plus_1_to_ended_candles();
