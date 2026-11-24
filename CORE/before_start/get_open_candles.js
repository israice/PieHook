
// ==========================================
// get current candles (candle 0)
// ===============import=====================
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { parse } from "yaml";

// ===============config=====================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "My custom comment";
const SETTINGS_FILE = "THE_SETTINGS.yaml";
const THE_PAIRS_KEY = "THE_PAIRS";
const THE_TIMEFRAMES_KEY = "THE_TIMEFRAMES";
const OUTPUT_CSV = "CORE/first_candle_copy/copy_websocket_candle.csv";
const BINANCE_API = "https://fapi.binance.com";
const ENCODING = "utf8";
const CSV_SEPARATOR = ",";
const CSV_HEADER = "pair,timeframe,candle,close,open,high,low,open_time,update_time,close_time";

// ===============logic======================
async function get_open_candles() {
  const startTime = SHOW_EXECUTION_TIME ? performance.now() : 0;

  const settings = parse(await readFile(SETTINGS_FILE, ENCODING));

  const serverResponse = await fetch(`${BINANCE_API}/fapi/v1/time`);
  if (!serverResponse.ok) {
    throw new Error(`Binance server time error: ${serverResponse.status}`);
  }

  const serverTime = (await serverResponse.json()).serverTime;

  const columns = CSV_HEADER.split(CSV_SEPARATOR);
  const rows = [];

  const formatTime = timestamp =>
    new Date(Number(timestamp)).toISOString().slice(0, 19).replace("T", " ");

  for (const pair of settings[THE_PAIRS_KEY]) {
    for (const timeframe of settings[THE_TIMEFRAMES_KEY]) {

      const url = `${BINANCE_API}/fapi/v1/klines?symbol=${pair}&interval=${timeframe}&limit=1`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Binance kline error: ${pair} ${timeframe} (${response.status})`);
      }

      const data = await response.json();

      // Получаем текущую незакрытую свечу (candle 0)
      const candles = data.slice(-1);

      candles.forEach(candle => {
        const values = {
          pair,
          timeframe,
          candle: 0,
          close: candle[4],
          open: candle[1],
          high: candle[2],
          low: candle[3],
          open_time: formatTime(candle[0]),
          update_time: formatTime(serverTime),
          close_time: formatTime(candle[6])
        };

        rows.push(columns.map(column => values[column]).join(CSV_SEPARATOR));
      });
    }
  }

  // ===============sorting==================
  const TF_MINUTES = {
    "1m": 1, "3m": 3, "5m": 5, "15m": 15, "30m": 30,
    "1h": 60, "2h": 120, "4h": 240, "6h": 360, "8h": 480, "12h": 720,
    "1d": 1440, "3d": 4320, "1w": 10080, "1M": 43200
  };

  const tfMinutes = tf => TF_MINUTES[tf] ?? Infinity;

  rows.sort((a, b) => {
    const A = a.split(CSV_SEPARATOR);
    const B = b.split(CSV_SEPARATOR);

    if (A[0] < B[0]) return -1;
    if (A[0] > B[0]) return 1;

    const ta = tfMinutes(A[1]);
    const tb = tfMinutes(B[1]);

    if (ta < tb) return -1;
    if (ta > tb) return 1;

    return 0;
  });

  // ===============output===================
  await mkdir(dirname(OUTPUT_CSV), { recursive: true });

  await writeFile(
    OUTPUT_CSV,
    [CSV_HEADER, ...rows].join("\n") + "\n",
    ENCODING
  );

  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`);
}

// ===============export=====================
export { get_open_candles };

// ===============run========================
if (process.argv[1] === import.meta.filename) {
  get_open_candles();
}
