// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { GET_all_balances } from "./tools/GET_all_balances.js";
// Получаем __dirname в ES-модуле
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Открытие браузера
function openBrowser(url) {
    let cmd;
    if (process.platform === "win32") {
        cmd = `start "" "${url}"`;
    }
    else if (process.platform === "darwin") {
        cmd = `open "${url}"`;
    }
    else {
        cmd = `xdg-open "${url}"`;
    }
    exec(cmd, (err) => {
        if (err)
            console.error("Не удалось запустить браузер:", err);
    });
}
// Функция запуска получения балансов
async function runGetAllBalances() {
    try {
        await GET_all_balances();
        console.log("✅ GET_all_balances выполнена");
    }
    catch (err) {
        console.error("❌ Ошибка в GET_all_balances:", err);
    }
}
// Функция запуска сервера
async function startServer() {
    // 1) Получаем балансы один раз при старте
    await runGetAllBalances();
    // 2) Настройка Express
    const app = express();
    const FRONTEND_DIR = path.join(__dirname, "frontend");
    const DATA_DIR = path.join(__dirname, "data");
    // 2.1) Отдача JSON-файлов
    app.use("/data", express.static(DATA_DIR));
    // 2.2) Отдача фронтенда
    app.use("/", express.static(FRONTEND_DIR));
    // 2.3) SPA fallback
    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(FRONTEND_DIR, "index.html"));
    });
    // 3) Запуск сервера
    const PORT = 3000;
    app.listen(PORT, () => {
        const url = `http://localhost:${PORT}`;
        console.log(`✅ Сервер запущен: ${url}`);
        openBrowser(url);
        // 4) Периодическое обновление данных
        setInterval(runGetAllBalances, 60 * 1000);
    });
}
startServer();
