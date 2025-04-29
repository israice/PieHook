// 1. Подключает модули и загружает настройки
// 2. Устанавливает обработчик Ctrl+C для корректного завершения
// 3. Выполняет полный цикл обработки данных
// 4. Делает паузу на заданное время
// 5. Повторяет шаги 3–4 до остановки

// ===================== НАСТРОЙКИ ===================== //
const LOOP_ENABLED = true; // ← true - включить бесконечный запуск
const LOOP_DELAY_MS = 1; // ← Задержка между циклами в миллисекундах
// ===================================================== //

import { GET_data_using_REST } from "./core/B_check/Binance/GET_data/GET_data_using_REST.js";
import { create_candles_percent } from "./core/tools/create_candles_percent.js";
import { create_candles_trend } from "./core/tools/create_candles_trend.js";
import { create_paths_file } from "./core/create_paths_file.js";
import { check_each_counter } from "./core/check_each_counter.js";
import { clone_old_data } from "./core/tools/clone_old_data.js";
import { delete_previus_session } from "./core/delete_previus_session.js";
import { clone_config_file } from "./core/tools/clone_config_file.js";
import { clear_front_files } from "./core/tools/clear_front_files.js";

let shouldStop = false;
process.on("SIGINT", () => {
  shouldStop = true;
});

async function run_List_0() {
  await delete_previus_session();
  await clone_config_file();
  await clear_front_files();
}

async function run_List() {
  console.time("Speed");
  await GET_data_using_REST();
  await create_candles_percent();
  await create_candles_trend();
  await create_paths_file();
  await check_each_counter();
  await clone_old_data();
  console.timeEnd("Speed");
}

async function loopWithDelay() {
  // один раз при старте
  await run_List_0();

  if (!LOOP_ENABLED) {
    return;
  }

  while (!shouldStop) {
    await run_List();
    if (shouldStop) {
      process.exit(0);
    }
    await new Promise((resolve) => setTimeout(resolve, LOOP_DELAY_MS));
  }
}

loopWithDelay();
