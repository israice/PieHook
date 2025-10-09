import fs from "fs/promises";
import yaml from "js-yaml";
// -------------------------------------------------
import { disable_RUN_RESET } from "../../../6_Tools/disable_RUN_RESET.js";
// -------------------------------------------------
const CONFIG_PATH = "CORE/4_Data/D_check_data.yaml";
const CHECK_KEY = "RUN_RESET";
const CHECK_WORD = "ENABLED";
// -------------------------------------------------
async function runList() {

  await disable_RUN_RESET();

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
async function check_reset() {
  try {
    const config = await readConfig();
    if (config[CHECK_KEY] === CHECK_WORD) {
      await runList();
    }
  } catch (error) {
    await handleError(error, "Script failed:");
  }
}

// check_reset();
export { check_reset };
