// 1. Подключает модули и загружает настройки
// 2. Устанавливает обработчик Ctrl+C для корректного завершения
// 3. Выполняет полный цикл обработки данных
// 4. Делает паузу на заданное время
// 5. Повторяет шаги 3–4 до остановки

// ===================== НАСТРОЙКИ ===================== //
const LOOP_ENABLED: boolean = true; // ← true - включить бесконечный запуск
const LOOP_DELAY_MS: number = 3000; // ← Задержка между циклами в миллисекундах
// ====================================================== //

import { message_good, message_ping } from "./tools/messages.js";

let shouldStop: boolean = false;

// Обработчик SIGINT (Ctrl+C)
process.on("SIGINT", (): void => {
  shouldStop = true;
});

async function run_List_0(): Promise<void> {
  await message_good();
}

async function run_List(): Promise<void> {

  await message_ping();

}

async function loopWithDelay(): Promise<void> {
  // Выполнить начальную подготовку один раз
  await run_List_0();

  if (!LOOP_ENABLED) {
    return;
  }

  while (!shouldStop) {
    console.time("Speed");
    
    await run_List();
    if (shouldStop) {
      process.exit(0);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, LOOP_DELAY_MS));
    
    console.timeEnd("Speed");
  }
}

// Запуск основного цикла
loopWithDelay();
