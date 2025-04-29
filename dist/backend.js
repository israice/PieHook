// 1. Подключает модули и загружает настройки
// 2. Устанавливает обработчик Ctrl+C для корректного завершения
// 3. Выполняет полный цикл обработки данных
// 4. Делает паузу на заданное время
// 5. Повторяет шаги 3–4 до остановки
// ===================== НАСТРОЙКИ ===================== //
const LOOP_ENABLED = true; // ← true - включить бесконечный запуск
const LOOP_DELAY_MS = 3000; // ← Задержка между циклами в миллисекундах
// ====================================================== //
import { message_good, message_ping } from "./tools/messages.js";
let shouldStop = false;
// Обработчик SIGINT (Ctrl+C)
process.on("SIGINT", () => {
    shouldStop = true;
});
async function run_List_0() {
    await message_good();
}
async function run_List() {
    await message_ping();
}
async function loopWithDelay() {
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
        await new Promise((resolve) => setTimeout(resolve, LOOP_DELAY_MS));
        console.timeEnd("Speed");
    }
}
// Запуск основного цикла
loopWithDelay();
