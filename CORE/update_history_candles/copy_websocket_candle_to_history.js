import fsp from "node:fs/promises";
import path from "node:path";

// ==========================================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "My custom comment";
// ==========================================
const SOURCE_FILE = "CORE/first_candle_copy/copy_websocket_candle.csv";
const DESTINATION_FILE = "THE_HISTORY.csv";
const ENCODING = "utf8";
const SEPARATOR = ",";
const PAIR_KEY = "pair";
const TIMEFRAME_KEY = "timeframe";
const CANDLE_KEY = "candle";
// ==========================================

const copy_websocket_candle_to_history = async () => {
  const startTime = SHOW_EXECUTION_TIME ? performance.now() : 0;

  const parseCSV = text => {
    const lines = text.trim().split(/\r?\n/);
    const header = lines.shift().replace(/^\uFEFF/, "");
    const columns = header.split(SEPARATOR).map(column => column.trim());

    const indexes = {
      candle: columns.indexOf(CANDLE_KEY),
      pair: columns.indexOf(PAIR_KEY),
      timeframe: columns.indexOf(TIMEFRAME_KEY)
    };

    if (Object.values(indexes).some(index => index === -1)) {
      throw new Error(`CSV header must contain ${CANDLE_KEY}, ${PAIR_KEY} and ${TIMEFRAME_KEY} columns`);
    }

    return { header, rows: lines, indexes };
  };

  const getValues = line => line.split(SEPARATOR);

  const getKey = (line, indexes) => {
    const values = getValues(line);
    return `${values[indexes.pair].trim()}|${values[indexes.timeframe].trim()}|${values[indexes.candle].trim()}`;
  };

  const source = parseCSV(await fsp.readFile(SOURCE_FILE, ENCODING));
  const destination = parseCSV(await fsp.readFile(DESTINATION_FILE, ENCODING));

  const sourceRows = new Map(
    source.rows.map(line => [getKey(line, source.indexes), line])
  );

  const destRows = new Map();
  for (const line of destination.rows) {
    destRows.set(getKey(line, destination.indexes), line);
  }

  for (const [key, sourceLine] of sourceRows) {
    destRows.set(key, sourceLine); // заменить если есть, добавить если нет
  }

  const columns = destination.header.split(SEPARATOR).map(column => column.trim());
  const pairIdx = columns.indexOf(PAIR_KEY);
  const timeframeIdx = columns.indexOf(TIMEFRAME_KEY);
  const candleIdx = columns.indexOf(CANDLE_KEY);

  const TF_MINUTES = {
    "1m": 1, "3m": 3, "5m": 5, "15m": 15, "30m": 30,
    "1h": 60, "2h": 120, "4h": 240, "6h": 360, "8h": 480, "12h": 720,
    "1d": 1440, "3d": 4320, "1w": 10080, "1M": 43200
  };
  const tfMinutes = (tf) => TF_MINUTES[tf] ?? Infinity;

  const result = [...destRows.values()].sort((a, b) => {
    const A = a.split(SEPARATOR);
    const B = b.split(SEPARATOR);
    const ap = A[pairIdx]?.trim() ?? "";
    const bp = B[pairIdx]?.trim() ?? "";
    if (ap < bp) return -1;
    if (ap > bp) return 1;
    const ta = tfMinutes(A[timeframeIdx]?.trim());
    const tb = tfMinutes(B[timeframeIdx]?.trim());
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    const ac = A[candleIdx]?.trim() ?? "";
    const bc = B[candleIdx]?.trim() ?? "";
    if (ac < bc) return -1;
    if (ac > bc) return 1;
    return 0;
  });

  await fsp.mkdir(path.dirname(DESTINATION_FILE), { recursive: true });
  await fsp.writeFile(
    DESTINATION_FILE,
    [destination.header, ...result].join("\n") + "\n",
    ENCODING
  );

  if (SHOW_COMMENT) console.log(COMMENT_TEXT);

  if (SHOW_EXECUTION_TIME) {
    console.log(
      `Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`
    );
  }
};

// ==========================================
export { copy_websocket_candle_to_history };

// ===============run========================
if (process.argv[1] === import.meta.filename) copy_websocket_candle_to_history();