import fs from "fs/promises";
import yaml from "js-yaml";
import { get_candle_from_redis } from "../../6_Tools/get_candle[0]_from_redis.js";
import { clone_candle_0 } from "../../6_Tools/clone_candle[0].js";
import { disable_BEFORE_FIRST_START } from "../../6_Tools/disable_BEFORE_FIRST_START.js";

// -------------------------------------------------
const CONFIG_PATH = "CORE/2_Backend/A_BEFORE_FIRST_START/A_check_if_on.yaml";
const CHECK_KEY = "BEFORE_FIRST_START";
const CHECK_WORD = "on";
// -------------------------------------------------
async function runList() {
  await get_candle_from_redis();
  await clone_candle_0();
  await disable_BEFORE_FIRST_START();
}
// -------------------------------------------------

// Read YAML file
async function readConfig() {
  try {
    const fileContent = await fs.readFile(CONFIG_PATH, "utf8");
    return yaml.load(fileContent) || {};
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`[A_check_if_on] Config file not found: ${CONFIG_PATH}`);
    } else {
      console.log(
        `[A_check_if_on] Error reading config file: ${error.message}`
      );
    }
    throw error;
  }
}

// Handle errors
async function handleError(error, message) {
  console.error(message, error);
}

// Main function
async function before_first_start() {
  try {
    const config = await readConfig();
    if (config[CHECK_KEY] === CHECK_WORD) {
      await runList();
    }
  } catch (error) {
    await handleError(error, "Script failed:");
  }
}

// before_first_start();
export { before_first_start };
