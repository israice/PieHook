import fsp from "node:fs/promises";

// =========================================
const SETTINGS_FILE = "THE_SETTINGS.yaml";
const SETTING_NAME = "DELAY_PAUSE_IN_SECONDS";
// =========================================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "My custom comment";
// =========================================
const SETTINGS_ENCODING = "utf-8";
// =========================================

export const the_delay_from_SETTINGS = async () => {
  const start = Date.now();

  try {
    const content = await fsp.readFile(SETTINGS_FILE, SETTINGS_ENCODING);
    const match = content.match(new RegExp(`^\\s*${SETTING_NAME}\\s*:\\s*(\\d+)\\s*$`, "m"));

    if (!match) throw new Error(`${SETTING_NAME} not found or invalid`);

    if (SHOW_COMMENT) console.log(COMMENT_TEXT);

    await new Promise(resolve => setTimeout(resolve, Number(match[1]) * 1000));

    if (SHOW_EXECUTION_TIME) {
      console.log(`Time: ${((Date.now() - start) / 1000).toFixed(3)} seconds`);
    }
  } catch (err) {
    console.error(`[SLEEP ERROR] ${err.message}`);
    process.exit(1);
  }
};

if (process.argv[1] === import.meta.filename) {
  await the_delay_from_SETTINGS();
}