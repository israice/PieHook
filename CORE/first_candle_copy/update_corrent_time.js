
// ==========================================
// write current time to dashboard
// ===============import=====================
import { readFile, writeFile } from "node:fs/promises";

// ===============config=====================
const DASHBOARD_FILE = new URL("../../THE_DASHBOARD.yaml", import.meta.url);
const CURRENT_TIME_KEY = "THE_CORRENT_TIME";

// ===============logic======================
async function update_corrent_time() {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const dashboard = await readFile(DASHBOARD_FILE, "utf8");

  await writeFile(
    DASHBOARD_FILE,
    dashboard.replace(new RegExp(`^${CURRENT_TIME_KEY}:.*$`, "m"), `${CURRENT_TIME_KEY}: ${now}`),
    "utf8",
  );
}

// ===============export=====================
export { update_corrent_time };
// ===============run========================
if (process.argv[1] === import.meta.filename) update_corrent_time();
