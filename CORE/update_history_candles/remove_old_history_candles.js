// ==========================================
// remove history rows with candle above 10
// ===============import=====================
import fsp from "node:fs/promises";

// ===============config=====================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "remove_old_history_candles";
// ==========================================
const HISTORY_CSV = "THE_HISTORY.csv";
const CANDLE_KEY = "candle";
const MAX_CANDLE = 10;
// ==========================================
const ENCODING = "utf8";
const SEPARATOR = ",";

// ===============logic======================
async function remove_old_history_candles() {
  const startTime = SHOW_EXECUTION_TIME ? performance.now() : 0;

  let text;
  try {
    text = await fsp.readFile(HISTORY_CSV, ENCODING);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  const [header, ...rows] = text.trim().split(/\r?\n/);
  const columns = header.replace(/^\uFEFF/, "").split(SEPARATOR).map(column => column.trim());
  const candleIdx = columns.indexOf(CANDLE_KEY);

  if (candleIdx === -1) {
    throw new Error(`${HISTORY_CSV}: header must contain ${CANDLE_KEY} column`);
  }

  // unparseable candle values are kept so a bad row is never lost silently
  const kept = rows.filter(line => !(Number(line.split(SEPARATOR)[candleIdx]?.trim()) > MAX_CANDLE));

  await fsp.writeFile(HISTORY_CSV, [header, ...kept].join("\n") + "\n", ENCODING);

  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`);
}

// ===============export=====================
export { remove_old_history_candles };

// ===============run========================
if (process.argv[1] === import.meta.filename) remove_old_history_candles();
