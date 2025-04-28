import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

// Импорт функций сброса и обработки конфигураций
import { check_Trend } from "./check_trend.js";

async function run_List() {
    await check_Trend();
  }

/**
 * Читает YAML-файл и возвращает значение ключа, который заканчивается на "_open_time".
 *
 * @param {string} filePath — путь к YAML-файлу.
 * @returns {Promise<string>} — найденное значение.
 */
async function getOpenTime(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const data = yaml.load(content);
  const key = Object.keys(data).find(k => k.endsWith('_open_time'));
  if (!key) {
    throw new Error(`Ключ с окончанием _open_time не найден в файле ${filePath}`);
  }
  return data[key];
}

/**
 * Сравнивает значения _open_time из двух YAML-файлов и, если они различаются,
 * запускает выполнение функции run_List.
 */
async function compaire_open_time() {
  try {
    const candlePath = path.join('core', 'the_candle', 'candle.yaml');
    const oldCandlePath = path.join('core', 'the_candle', 'old_candle.yaml');

    const candleTime = await getOpenTime(candlePath);
    const oldCandleTime = await getOpenTime(oldCandlePath);

    if (candleTime !== oldCandleTime) {
      await run_List();
    } else {
      console.log("Значения совпадают. Действия не требуются.");
    }
  } catch (error) {
    console.error("Ошибка при выполнении проверки:", error);
  }
}

// Экспорт основной функции через именованный экспорт (без использования default)
export { compaire_open_time };
