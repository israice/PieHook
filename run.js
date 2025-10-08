
// ================== ИМПОРТ ==================
import { create_candles_percent } from "./2-Backend/tools/create_candles_percent.js";
import { create_candles_trend } from "./2-Backend/tools/create_candles_trend.js";
import { clone_old_data } from "./2-Backend/tools/clone_old_data.js";
import { delete_previus_session } from "./2-Backend/delete_previus_session.js";
import { clone_settings } from "./2-Backend/clone_settings.js";


const LOOP_DELAY_MS = 200;
let loopMode = true;
let stopRequested = false;


// --- подготовка окружения ---
async function prepareEnvironment() {
  // await delete_previus_session();
  await clone_settings();
}

// --- одна итерация обработки ---
async function runIteration() {
  console.time("Speed");
  // await create_candles_percent();
  // await create_candles_trend();
  await clone_old_data();
  console.timeEnd("Speed");
}

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
  await runIteration();
  if (stopRequested) {
    console.log("Stopping after current iteration.");
    process.exit(0);
  }
  scheduleNextIteration();
}

async function main_runner() {
  await prepareEnvironment();
  if (!loopMode) {
    console.log("One-shot mode:");
    await runIteration();
    console.log("Done.");
    process.exit(0);
  }
  console.log("Loop mode started. Press Ctrl+C to stop after current iteration.");
  runLoop();
}

// ================== СТАРТ ==================
main_runner();
