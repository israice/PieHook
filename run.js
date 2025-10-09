// ================== ИМПОРТ ==================
import { backend_runner } from "./CORE/2_Backend/A_run.js";
import { clone_candle_0 } from "./CORE/2_Backend/AA_clone_candle[0].js";

const LOOP_DELAY_MS = 500;
let loopMode = true;
let stopRequested = false;

// ================================================

async function pre_start_list() {
  await clone_candle_0();
}

// ================================================

async function list_in_loop() {
  console.time("Speed");

  await backend_runner();

  console.timeEnd("Speed");
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
    console.log("Loop stopped gracefully.");
    process.exit(0);
  }
  setTimeout(runLoop, LOOP_DELAY_MS);
}

// --- основной процесс цикла ---
async function runLoop() {
  await list_in_loop();
  if (stopRequested) {
    console.log("Stopping after current iteration.");
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
  console.log(
    "Loop mode started. Press Ctrl+C to stop after current iteration."
  );
  runLoop();
}

// ================== СТАРТ ==================
main_runner();
