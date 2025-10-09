import fs from "fs/promises";
import yaml from "js-yaml";
import { get_candle_from_redis } from "../../../6_Tools/get_candle[0]_from_redis.js";
import { clone_candle_0 } from "../../../6_Tools/clone_candle[0].js";
import { disable_RUN_PRE_START } from "../../../6_Tools/disable_RUN_PRE_START.js";

// -------------------------------------------------
const CONFIG_PATH = "CORE/4_Data/D_check_data.yaml";
const CHECK_KEY = "RUN_PRE_START";
const CHECK_WORD = "ENABLED";
// -------------------------------------------------
async function runList() {
  await get_candle_from_redis();
  await clone_candle_0();
  await disable_RUN_PRE_START();
}
// -------------------------------------------------

// Read YAML file
async function readConfig() {
  const fileContent = await fs.readFile(CONFIG_PATH, "utf8");
  return yaml.load(fileContent) || {};
}

// Handle errors
async function handleError(error, message) {
  console.error(message, error);
}

// Main function
async function check_pre_start() {
  try {
    const config = await readConfig();
    if (config[CHECK_KEY] === CHECK_WORD) {
      await runList();
    }
  } catch (error) {
    await handleError(error, "Script failed:");
  }
}

// check_pre_start();
export { check_pre_start };
