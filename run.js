// ==========================================
// run main script
// ===============import=====================
import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import process from "node:process";
// ==========================================
import { CORE } from "./CORE/run.js";
import { text } from "./TOOLS/text.js";
import { before_start } from "./CORE/before_start/run.js";

// ===============config=====================
const RUNNING_WEBSOCKET_PROCESS = ["CORE/websocket_stream/binance_websocket.js"];
const FIRST_WRITE_FILE = "CORE/websocket_stream/binance_websocket.csv";
const FIRST_WRITE_POLL_MS = 200;
const SHOW_EXECUTION_TIME = true;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "My custom comment";

// ===============list=======================
async function LIST_THAT_RUNNING_ONCE_ON_STARTUP() { 
  await before_start(); 
}

async function LIST_THAT_RUNNING_IN_LOOP() {
  await CORE();
}

async function LIST_THAT_RUNNING_AFTER_STOP() { 
  await text(); 
}

// ===============logic======================
const RUN = (childProcess, timeout = 5000) => childProcess.exitCode !== null || childProcess.signalCode !== null ? Promise.resolve() : new Promise((resolve) => {
  const timer = setTimeout(() => { if (childProcess.exitCode === null && childProcess.signalCode === null) childProcess.kill("SIGKILL"); }, timeout);
  childProcess.once("close", () => { clearTimeout(timer); resolve(); });
  childProcess.kill("SIGTERM");
});

async function runMainProcess() {
  const childProcesses = [];
  let SHOULD_STOP = false;
  const mtimeOf = async () => { try { return (await stat(FIRST_WRITE_FILE)).mtimeMs; } catch { return null; } };
  const waitForFirstWrite = async (childProcess, initialMtime) => {
    while (!SHOULD_STOP) {
      if (childProcess.exitCode !== null || childProcess.signalCode !== null) return false;
      if (await mtimeOf() !== initialMtime) return true;
      await new Promise((resolve) => setTimeout(resolve, FIRST_WRITE_POLL_MS));
    }
    return false;
  };
  const killChildren = () => {
    for (const childProcess of childProcesses) {
      if (childProcess.exitCode === null && childProcess.signalCode === null) childProcess.kill("SIGKILL");
    }
  };

  process.on("exit", killChildren);
  process.on("uncaughtException", (error) => { killChildren(); console.error("[FATAL ERROR]", error); process.exit(1); });
  process.on("unhandledRejection", (reason) => { killChildren(); console.error("[FATAL ERROR]", reason); process.exit(1); });
  process.on("SIGINT", () => { SHOULD_STOP = true; killChildren(); });
  process.on("SIGTERM", () => { SHOULD_STOP = true; killChildren(); });

  try {
    const initialMtime = await mtimeOf();
    for (const scriptPath of RUNNING_WEBSOCKET_PROCESS) {
      const childProcess = spawn(process.execPath, [scriptPath], { stdio: "inherit" });
      childProcesses.push(childProcess);
      childProcess.on("error", (error) => { console.error("[WEBSOCKET ERROR]", error.message); SHOULD_STOP = true; });
      childProcess.on("exit", (code) => { if (code !== 0 && !SHOULD_STOP) { console.error("[WEBSOCKET STOPPED]", code); SHOULD_STOP = true; } });
    }

    await LIST_THAT_RUNNING_ONCE_ON_STARTUP();
    if (await waitForFirstWrite(childProcesses[0], initialMtime)) {
      while (!SHOULD_STOP) await LIST_THAT_RUNNING_IN_LOOP();
    }

  } catch (error) { console.error("[ERROR]", error.message); }
  finally {
    await Promise.all(childProcesses.map((childProcess) => RUN(childProcess)));
    try { await LIST_THAT_RUNNING_AFTER_STOP(); } catch (error) { console.error("[AFTER STOP ERROR]", error.message); }
    console.log("[DONE] Программа завершена.");
  }
}

const originalLoop = LIST_THAT_RUNNING_IN_LOOP;
LIST_THAT_RUNNING_IN_LOOP = async () => { if (SHOW_COMMENT) console.log(COMMENT_TEXT); const executionStartTime = performance.now(); try { await originalLoop(); } finally { if (SHOW_EXECUTION_TIME) console.log(`[TIME] ${((performance.now() - executionStartTime) / 1000).toFixed(3)} sec`); } };

// ===============export=====================
export { runMainProcess };

runMainProcess().catch((error) => { console.error("[FATAL ERROR]", error); process.exitCode = 1; });