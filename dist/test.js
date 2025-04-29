// src/index.ts
import { message_ping } from "./tools/messages.js"; // Убедись, что файл имеет экспорт, совместимый с TS
async function run_List() {
    console.time("Speed");
    await message_ping();
    console.timeEnd("Speed");
    // Повторный запуск с задержкой 1 секунда (рекурсивно через setTimeout, так как setImmediate не поддерживает задержку)
    setTimeout(run_List, 1000);
}
run_List();
