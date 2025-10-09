
import { clone_candle_0 } from "./AA_clone_candle[0].js";
import { get_candle_from_redis } from "./ZZ_get_candle[0]_from_redis.js";

async function backend_runner() {

  await get_candle_from_redis();
  await clone_candle_0();

}

export { backend_runner };
