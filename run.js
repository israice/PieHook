// ================== ИМПОРТ ==================
import { before_first_start } from "./CORE/2_Backend/A_BEFORE_FIRST_START/A_check_if_on.js";
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
  // Пропускаем проверку Docker если запущены внутри контейнера (production mode)
  if (process.env.REDIS_HOST) {
    console.log("🐳 Running inside Docker container - skipping Docker check");
    console.log("✅ Using Redis at:", process.env.REDIS_HOST);
    return;
  }

  console.log("🔍 Checking Docker containers...");

  try {
    // Проверяем состояние контейнеров (все, включая остановленные)
    const allContainers = execSync(
      'docker ps -a --filter "name=PieHook-Redis" --format "{{.Names}} {{.Status}}"',
      {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    ).trim();

    if (!allContainers) {
      // Контейнеры не существуют - создаём и запускаем
      console.log("🚀 Creating and starting Docker containers...");
      execSync("docker-compose up -d --build", { stdio: "inherit" });
      console.log("✅ Docker containers created and started");
    } else if (allContainers.includes("Up")) {
      // Контейнеры уже запущены
      console.log("✅ Docker containers are already running");
      return;
    } else {
      // Контейнеры существуют, но остановлены
      console.log("🔄 Starting Docker containers...");
      execSync("docker-compose up -d", { stdio: "inherit" });
      console.log("✅ Docker containers started");
    }
  } catch (error) {
    console.error("❌ Failed to start Docker containers:", error.message);
    console.log("\n💡 Please ensure Docker is running and try again.");
    process.exit(1);
  }

  // Ждём пока Redis и Frontend будут готовы
  console.log("⏳ Waiting for services to be ready...");
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

// ================================================

async function pre_start_list() {
  await before_first_start();
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

// --- остановка цикла ---
async function stopLoop() {
  await after_finish();
  console.log("Loop stopped gracefully.");
  process.exit(0);
}

// --- выполнение в цикле ---
async function scheduleNextIteration() {
  if (stopRequested) {
    await stopLoop();
  }
  setTimeout(runLoop, LOOP_DELAY_MS);
}

// --- основной процесс цикла ---
async function runLoop() {
  await list_in_loop();
  if (stopRequested) {
    await stopLoop();
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
