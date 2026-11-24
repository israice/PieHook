// ==========================================
// run list of scripts
// ===============import=====================
import { settings_copy } from "./settings_copy.js";
import { check_if_timframe_ended } from "./check_if_timframe_ended.js";
import { add_plus_1_to_ended_candles } from "./add_plus_1_to_ended_candles.js";
import { get_new_closed_candles } from "./get_new_closed_candles.js";
import { remove_old_history_candles } from "./remove_old_history_candles.js";
import { disable_all } from "./disable_all.js";
import { copy_websocket_candle_to_history } from "./copy_websocket_candle_to_history.js";

// ===============config=====================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "update_history_candles";

// ===============logic======================
async function update_history_candles() {
  const startTime = SHOW_EXECUTION_TIME ? performance.now() : 0;

  await settings_copy();
  await check_if_timframe_ended();
  await add_plus_1_to_ended_candles();
  await get_new_closed_candles();
  await remove_old_history_candles();
  await disable_all();
  await copy_websocket_candle_to_history();

  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`);
}

// ===============export=====================
export { update_history_candles };

// ===============run========================
if (process.argv[1] === import.meta.filename) update_history_candles();
