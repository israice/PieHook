// ==========================================
// run list of scripts
// ==========================================
import { copy_websocket_candle } from "./copy_websocket_candle.js";
import { update_session_time } from "./update_session_time.js";
import { update_corrent_time } from "./update_corrent_time.js";

// ==========================================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "My custom comment";
// ==========================================
async function first_candle_copy() {
  await update_session_time();
  await update_corrent_time();
  await copy_websocket_candle();
}

// ==========================================
const original = first_candle_copy;
first_candle_copy = async () => {
  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  const t = Date.now();
  try { await original(); }
  finally { if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((Date.now() - t) / 1000).toFixed(3)} sec`); }
};

// ==========================================
export { first_candle_copy };

// ===============run========================
if (process.argv[1] === import.meta.filename) first_candle_copy();