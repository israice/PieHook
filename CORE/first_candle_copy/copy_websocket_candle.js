import fsp from "node:fs/promises";
import path from "node:path";

// ==========================================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "My custom comment";
// ==========================================
const sourceFile = "CORE/websocket_stream/binance_websocket.csv";
const destinationFile = "CORE/first_candle_copy/copy_websocket_candle.csv";
const CSV_HEADER = "pair,timeframe,candle,close,open,high,low,open_time,update_time,close_time";

// ==========================================
const copy_websocket_candle = async () => {
  const startTime = SHOW_EXECUTION_TIME ? performance.now() : 0;

  await fsp.mkdir(path.dirname(destinationFile), { recursive: true });

  try {
    await fsp.copyFile(sourceFile, destinationFile);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    await fsp.writeFile(destinationFile, CSV_HEADER + "\n", "utf8");
  }

  if (SHOW_COMMENT) console.log(COMMENT_TEXT);

  if (SHOW_EXECUTION_TIME) {
    console.log(`Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`);
  }
};

// ==========================================
export { copy_websocket_candle };

// ===============run========================
if (process.argv[1] === import.meta.filename) copy_websocket_candle();
