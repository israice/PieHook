
 // ==========================================
 // reset csv files
 // ===============import=====================
import { readFile, writeFile } from "node:fs/promises";

// ===============config=====================
const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "My custom comment";
const CSV_FILES = [
  "CORE/first_candle_copy/copy_websocket_candle.csv",
];

// ===============logic======================
async function reset_csv_files() {
  const startTime = SHOW_EXECUTION_TIME ? performance.now() : 0;

  for (const filePath of CSV_FILES) {
    const content = await readFile(filePath, "utf8");
    const lineEnd = content.search(/\r?\n/);
    const headerEnd = lineEnd === -1 ? content.length : lineEnd + (content[lineEnd] === "\r" ? 2 : 1);
    await writeFile(filePath, content.slice(0, headerEnd), "utf8");
  }

  if (SHOW_COMMENT) console.log(COMMENT_TEXT);
  if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`);
}

// ===============export=====================
export { reset_csv_files };
// ===============run========================
if (process.argv[1] === import.meta.filename) reset_csv_files();
