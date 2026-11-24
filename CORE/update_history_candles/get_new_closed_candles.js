// ==========================================
// add new closed candle 1 for every [pair,timeframe] marked true in settings_copy.yaml
// ===============import=====================
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { parse } from "yaml";

// ===============config=====================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "get_new_closed_candles";
// ==========================================
const SETTINGS_FILE = "CORE/update_history_candles/settings_copy.yaml";
const CLOSED_CANDLES = 1;
const PAIR_LIST_KEY = "THE_PAIR_LIST_WITH_TIMEFRAMES";
const MARKED_VALUE = "true";
const OUTPUT_CSV = "THE_HISTORY.csv";
const BINANCE_API = "https://fapi.binance.com";
const ENCODING = "utf8";
const CSV_SEPARATOR = ",";
const CSV_HEADER = "pair,timeframe,candle,close,open,high,low,open_time,update_time,close_time";
const PAIR_KEY = "pair";
const TIMEFRAME_KEY = "timeframe";
const CANDLE_KEY = "candle";

// ===============logic======================
async function get_new_closed_candles() {
  const startTime = SHOW_EXECUTION_TIME ? performance.now() : 0;

  const settings = parse(await readFile(SETTINGS_FILE, ENCODING)) ?? {};
  const list = settings[PAIR_LIST_KEY];

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`${SETTINGS_FILE}: ${PAIR_LIST_KEY} is missing or empty`);
  }

  // [pair,timeframe,true] -> fetch only the marked ones; check the suffix, split only marked rows
  const targets = list
    .filter(row => row.trim().endsWith(CSV_SEPARATOR + MARKED_VALUE))
    .map(row => {
      const [pair, timeframe] = row.split(CSV_SEPARATOR);
      return { pair: pair.trim(), timeframe: timeframe.trim() };
    });

  // nothing marked: no /time request, no CSV rewrite
  if (targets.length === 0) {
    if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`);
    return;
  }

  const serverTime = (await (await fetch(`${BINANCE_API}/fapi/v1/time`)).json()).serverTime;

  // keep every existing row, update a row only when the same candle arrives again
  let header = CSV_HEADER;
  let existing = [];
  try {
    const text = (await readFile(OUTPUT_CSV, ENCODING)).trim();
    if (text) [header, ...existing] = text.split(/\r?\n/);
    header = header.replace(/^\uFEFF/, "");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const columns = header.split(CSV_SEPARATOR).map(column => column.trim());
  const pairIdx = columns.indexOf(PAIR_KEY);
  const timeframeIdx = columns.indexOf(TIMEFRAME_KEY);
  const candleIdx = columns.indexOf(CANDLE_KEY);

  if ([pairIdx, timeframeIdx, candleIdx].includes(-1)) {
    throw new Error(`${OUTPUT_CSV}: header must contain ${PAIR_KEY}, ${TIMEFRAME_KEY} and ${CANDLE_KEY} columns`);
  }

  const keyOf = line => {
    const values = line.split(CSV_SEPARATOR);
    return [values[pairIdx], values[timeframeIdx], values[candleIdx]].map(value => value.trim()).join("|");
  };

  const rows = new Map(existing.map(line => [keyOf(line), line]));

  const formatTime = timestamp =>
    new Date(Number(timestamp)).toISOString().slice(0, 19).replace("T", " ");

  for (const { pair, timeframe } of targets) {
    const url = `${BINANCE_API}/fapi/v1/klines?symbol=${pair}&interval=${timeframe}&limit=${CLOSED_CANDLES + 1}`;
    const data = await (await fetch(url)).json();
    if (!Array.isArray(data)) throw new Error(`${url} returned an error: ${JSON.stringify(data)}`);

    const candle = data.filter(row => Number(row[6]) < serverTime).slice(-CLOSED_CANDLES)[0];
    if (!candle) continue;

    // CLOSED_CANDLES must stay 1: only candle 1 is freed per run
    const values = {
      pair,
      timeframe,
      candle: 1,
      close: candle[4],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      open_time: formatTime(candle[0]),
      update_time: formatTime(serverTime),
      close_time: formatTime(candle[6])
    };

    const line = columns.map(column => values[column]).join(CSV_SEPARATOR);
    rows.set(keyOf(line), line);
  }

  const TF_MINUTES = {
    "1m": 1, "3m": 3, "5m": 5, "15m": 15, "30m": 30,
    "1h": 60, "2h": 120, "4h": 240, "6h": 360, "8h": 480, "12h": 720,
    "1d": 1440, "3d": 4320, "1w": 10080, "1M": 43200
  };
  const tfMinutes = (tf) => TF_MINUTES[tf] ?? Infinity;

  const result = [...rows.values()].sort((a, b) => {
    const A = a.split(CSV_SEPARATOR);
    const B = b.split(CSV_SEPARATOR);
    if (A[0] < B[0]) return -1;
    if (A[0] > B[0]) return 1;
    const ta = tfMinutes(A[1]);
    const tb = tfMinutes(B[1]);
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    const ca = Number(A[2]);
    const cb = Number(B[2]);
    if (ca < cb) return -1;
    if (ca > cb) return 1;
    return 0;
  });

  await mkdir(dirname(OUTPUT_CSV), { recursive: true });
  await writeFile(OUTPUT_CSV, [header, ...result].join("\n") + "\n", ENCODING);

  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`);
}

// ===============export=====================
export { get_new_closed_candles };

// ===============run========================
if (process.argv[1] === import.meta.filename) get_new_closed_candles();
