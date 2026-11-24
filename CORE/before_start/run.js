
// ==========================================
// run list of scripts
// ===============import=====================
import { reset_csv_files } from "./reset_csv_files.js";
import { get_closed_candles } from "./get_closed_candles.js";
import { get_open_candles } from "./get_open_candles.js";
import { create_session_start_time } from "./create_session_start_time.js";

// ===============config=====================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "before_start";

// ===============list=======================
async function before_start() {
  await create_session_start_time();
  await reset_csv_files();
  await get_closed_candles();
  await get_open_candles();
}

// ===============logic======================
const original = before_start;
before_start = async () => {
  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  const t = Date.now();
  try { await original(); }
  finally { if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((Date.now() - t) / 1000).toFixed(3)} sec`); }
};

// ===============export=====================
export { before_start };

// ===============run========================
if (process.argv[1] === import.meta.filename) before_start();