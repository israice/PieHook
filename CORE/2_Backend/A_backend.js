import { clone_candle_0 } from "../6_Tools/clone_candle[0].js";
import { get_candle_from_redis } from "../6_Tools/get_candle[0]_from_redis.js";
import { check_pre_start } from "./A_RESET/A_pre_start/A_run.js";

async function backend_runner() {
  await check_pre_start();

  await get_candle_from_redis();
  await clone_candle_0();
}

export { backend_runner };
