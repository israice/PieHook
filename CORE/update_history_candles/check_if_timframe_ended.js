// ==========================================
// check every [pair,timeframe] from settings_copy.yaml:
// mark all rows of a timeframe true when update_time > close_time, write the marks back
// ===============import=====================
import fsp from "node:fs/promises";
import { parse, stringify } from "yaml";

// ===============config=====================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "check_if_timframe_ended";
// ==========================================
const TARGET_FILE = "CORE/update_history_candles/settings_copy.yaml";
const TARGET_KEY = "THE_PAIR_LIST_WITH_TIMEFRAMES";
const MARKED_VALUE = "true";
const UNMARKED_VALUE = "false";
// ==========================================
const PAIR_KEY = "pair";
const TIMEFRAME_KEY = "timeframe";
const CANDLE_KEY = "candle";
const CANDLE_VALUE = "0";
// ==========================================
const WEBSOCKET_CSV = "CORE/first_candle_copy/copy_websocket_candle.csv";
const UPDATE_TIME_KEY = "update_time";
// ==========================================
const HISTORY_CSV = "THE_HISTORY.csv";
const CLOSE_TIME_KEY = "close_time";
// ==========================================
const ENCODING = "utf8";
const SEPARATOR = ",";

// ===============logic======================
async function check_if_timframe_ended() {
  const startTime = SHOW_EXECUTION_TIME ? performance.now() : 0;

  const readRows = async (file, timeKey) => {
    const [header, ...rows] = (await fsp.readFile(file, ENCODING)).trim().split(/\r?\n/);
    const columns = header.replace(/^\uFEFF/, "").split(SEPARATOR).map(column => column.trim());

    if ([PAIR_KEY, TIMEFRAME_KEY, CANDLE_KEY, timeKey].some(key => !columns.includes(key))) {
      throw new Error(`${file}: header must contain ${PAIR_KEY}, ${TIMEFRAME_KEY}, ${CANDLE_KEY} and ${timeKey} columns`);
    }

    return new Map(rows.map(line => {
      const values = line.split(SEPARATOR).map(value => value.trim());
      const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
      return [[row[PAIR_KEY], row[TIMEFRAME_KEY], row[CANDLE_KEY]].join(SEPARATOR), row];
    }));
  };

  const websocketRows = await readRows(WEBSOCKET_CSV, UPDATE_TIME_KEY);
  const historyRows = await readRows(HISTORY_CSV, CLOSE_TIME_KEY);

  const text = await fsp.readFile(TARGET_FILE, ENCODING);
  const list = parse(text)?.[TARGET_KEY];

  if (!Array.isArray(list)) throw new Error(`${TARGET_FILE}: ${TARGET_KEY} not found`);

  const entries = list.map(row => row.split(SEPARATOR).map(value => value.trim()));
  const endedByTimeframe = new Map();

  // rows missing from the csv stay unmarked unless another pair marks their timeframe
  for (const [pair, timeframe] of entries) {
    if (endedByTimeframe.get(timeframe)) continue;

    const key = [pair, timeframe, CANDLE_VALUE].join(SEPARATOR);
    const websocket = websocketRows.get(key);
    const history = historyRows.get(key);
    if (!websocket || !history) continue;

    const updateTime = websocket[UPDATE_TIME_KEY];
    const closeTime = history[CLOSE_TIME_KEY];

    if (!updateTime || !closeTime) {
      throw new Error(`${WEBSOCKET_CSV}/${HISTORY_CSV} must contain ${UPDATE_TIME_KEY} and ${CLOSE_TIME_KEY} values`);
    }

    // ISO "YYYY-MM-DD HH:MM:SS" сравнивается как строка
    if (updateTime > closeTime) endedByTimeframe.set(timeframe, true);
  }

  const value = entries.map(([pair, timeframe]) =>
    [pair, timeframe, endedByTimeframe.get(timeframe) ? MARKED_VALUE : UNMARKED_VALUE].join(SEPARATOR)
  );

  const block = stringify({ [TARGET_KEY]: value }).replace(/\n$/, "");
  // key line at column 0 plus its indented value lines
  const pattern = new RegExp(`^${TARGET_KEY}:[^\\n]*(?:\\n[ \\t]+[^\\n]*)*`, "m");
  const updated = text.replace(pattern, () => block);

  if (updated !== text) await fsp.writeFile(TARGET_FILE, updated, ENCODING);

  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`);
}

// ===============export=====================
export { check_if_timframe_ended };

// ===============run========================
if (process.argv[1] === import.meta.filename) check_if_timframe_ended();
