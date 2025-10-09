// ================== ИМПОРТ ==================
import { check_pre_start } from "./CORE/2_Backend/A_RESET/A_pre_start/A_run.js";
import { backend_runner } from "./CORE/2_Backend/A_backend.js";
import { run_after_finish } from "./CORE/2_Backend/A_RESET/C_after_finish/C_run.js";

const LOOP_DELAY_MS = 500;
let loopMode = true;
let stopRequested = false;

// ================================================

async function pre_start_list() {
  console.log("- - Checking if Pre Start Needed...");
  await check_pre_start();
}

// ================================================

async function list_in_loop() {
  console.log("- - Backend Checks...");
  console.time("Speed");

  await backend_runner();

  console.timeEnd("Speed");
}

// ================================================

async function after_finish() {
  console.log("- - After Finish...");
  await run_after_finish();
}

// ================================================

process.on("SIGINT", handleStopSignal);

// --- graceful shutdown ---
function handleStopSignal() {
  console.log("\nStop requested — finishing current iteration...");
  stopRequested = true;
}

// --- выполнение в цикле ---
async function scheduleNextIteration() {
  if (stopRequested) {
    await after_finish();
    console.log("Loop stopped gracefully.");
    process.exit(0);
  }
  setTimeout(runLoop, LOOP_DELAY_MS);
}

// --- основной процесс цикла ---
async function runLoop() {
  await list_in_loop();
  if (stopRequested) {
    await after_finish();
    process.exit(0);
  }
  scheduleNextIteration();
}

async function main_runner() {
  await pre_start_list();
  if (!loopMode) {
    console.log("One-shot mode:");
    await list_in_loop();
    console.log("Done.");
    process.exit(0);
  }
  runLoop();
}

// ================== СТАРТ ==================
main_runner();
