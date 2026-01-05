// ================== ИМПОРТ ==================
import { check_pre_start } from "./CORE/2_Backend/A_RESET/A_pre_start/A_run.js";
import { backend_runner } from "./CORE/2_Backend/A_backend.js";
import { run_after_finish } from "./CORE/2_Backend/A_RESET/C_after_finish/C_run.js";
import { execSync } from "child_process";

const LOOP_DELAY_MS = 500;
let loopMode = true;
let stopRequested = false;

// ================================================
// 🐳 ПРОВЕРКА И ЗАПУСК DOCKER REDIS
// ================================================

async function ensureDockerRedisRunning() {
  console.log("🔍 Checking Docker containers...");

  try {
    // Проверяем, запущены ли контейнеры
    const output = execSync('docker ps --filter "name=PieHook-Redis" --format "{{.Names}}"', {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (output.includes("PieHook-Redis")) {
      console.log("✅ Docker containers are already running");
      return;
    }

    // Проверяем, существуют ли контейнеры (но остановлены)
    const allContainers = execSync('docker ps -a --filter "name=PieHook-" --format "{{.Names}}"', {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (allContainers.includes("PieHook-Redis")) {
      console.log("🔄 Starting Docker containers...");
      execSync("docker-compose up -d", { stdio: "inherit" });
      console.log("✅ Docker containers started");
      return;
    }

    // Контейнеры не существуют - создаём и запускаем
    console.log("🚀 Creating and starting Docker containers...");
    execSync("docker-compose up -d --build", { stdio: "inherit" });
    console.log("✅ Docker containers created and started");

  } catch (error) {
    console.error("❌ Failed to start Docker containers:", error.message);
    console.log("\n💡 Please ensure Docker is running and try again.");
    process.exit(1);
  }

  // Ждём пока Redis и Frontend будут готовы
  console.log("⏳ Waiting for services to be ready...");
  await new Promise(resolve => setTimeout(resolve, 5000));
}

// ================================================

async function pre_start_list() {
  console.log("- - Checking if Pre Start Needed...");
  await check_pre_start();
}

// ================================================

async function list_in_loop() {
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
  // Проверяем и запускаем Docker Redis перед началом работы
  await ensureDockerRedisRunning();

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
