import { enable_RUN_PRE_START } from "../../../6_Tools/enable_RUN_PRE_START.js";
import { disable_RUN_RESET } from "../../../6_Tools/disable_RUN_RESET.js";

// -------------------------------------------------

async function run_after_finish() {
  // reset D_check_data.yaml
  await enable_RUN_PRE_START();
  await disable_RUN_RESET();
}

// -------------------------------------------------

// run_after_finish();
export { run_after_finish };
