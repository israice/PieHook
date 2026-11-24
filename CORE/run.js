// ==========================================
// run list of scripts
// ==========================================
import { first_candle_copy } from "./first_candle_copy/run.js";
import { update_history_candles } from "./update_history_candles/run.js";
import { the_delay_from_SETTINGS } from "../TOOLS/the_delay_from_SETTINGS.js";

// ==========================================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "My custom comment";

// ===============list=======================
async function CORE() {
  await first_candle_copy();
  await update_history_candles();
  await the_delay_from_SETTINGS();
}

// ===============logic======================
const original = CORE;
CORE = async () => {
  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  const t = Date.now();
  try { await original(); }
  finally { if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((Date.now() - t) / 1000).toFixed(3)} sec`); }
};

// ===============export=====================
export { CORE };

// ===============run========================
if (process.argv[1] === import.meta.filename) CORE();
