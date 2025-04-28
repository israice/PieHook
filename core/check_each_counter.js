import fs from "fs/promises";
import path from "path";
import yaml from "yaml";
import { fileURLToPath } from "url";
import { bring_candle } from "./bring_candle.js";
import { check_closed_trend_count_status } from "./check_closed_trend_count_status.js";
import { LONG } from "./B_check/LONG/A_LONG.js";
import { SHORT } from "./B_check/SHORT/B_SHORT.js";
import { bring_candle_back } from "./bring_candle_back.js";

// === Настройки ===
const DELAY_MS = 100;  // Задержка после каждого выполнения списка в миллисекундах

// === Универсальный путь к корню проекта ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// === Путь к YAML‑файлу (от корня проекта) ===
const YAML_FILE = path.join(ROOT, "core", "B_check", "the_paths.yaml");

// Утилита паузы
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function for_each_in_list() {
  try {
    await bring_candle();
    await check_closed_trend_count_status();
    await LONG();
    await SHORT();
    await bring_candle_back();
  } catch (err) {
    console.error("❌ Ошибка внутри for_each_in_list:", err.message);
    throw err;
  }
}

async function check_each_counter() {
  while (true) {
    let content;
    try {
      content = await fs.readFile(YAML_FILE, "utf8");
    } catch (err) {
      console.error(`❌ Ошибка чтения YAML-файла (${YAML_FILE}):`, err.message);
      break;
    }

    const data = yaml.parse(content) || {};
    const pathsList = data.the_paths || [];
    const totalPaths = pathsList.length;
    const storedCounter = data.counter || 0;

    if (storedCounter < totalPaths) {
      // 1) Сначала выполняем for_each_in_list
      try {
        await for_each_in_list();
      } catch {
        break;  // при ошибке выходим из цикла
      }

      // 2) Только после успешного выполнения — инкрементируем counter
      data.counter = storedCounter + 1;
      try {
        await fs.writeFile(YAML_FILE, yaml.stringify(data), "utf8");
        console.log("- - counter:", data.counter);
      } catch (err) {
        console.error(`❌ Ошибка записи YAML-файла (${YAML_FILE}):`, err.message);
        break;
      }

      // 3) Пауза перед следующей итерацией
      await sleep(DELAY_MS);

    } else {
      // все пути обработаны — выходим
      break;
    }
  }
}

export { check_each_counter };
