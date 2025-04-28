// Импорт модулей
import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';

import { copy_first_candle_to_second_candle } from './copy_first_candle_to_second_candle.js';

// Список при LONG
async function long_List() {
  await copy_first_candle_to_second_candle();
}

// Список при SHORT
async function short_List() {
  await copy_first_candle_to_second_candle();
}

// Основная функция
async function check_closed_trend_add_next_candle() {
  try {
    const file1 = path.join('core', 'the_candle', 'candle.yaml');
    const file2 = path.join('core', 'the_candle', 'old_candle.yaml');

    const [content1, content2] = await Promise.all([
      fs.readFile(file1, 'utf8'),
      fs.readFile(file2, 'utf8'),
    ]);

    const data1 = yaml.parse(content1);
    const data2 = yaml.parse(content2);

    // Ищем ключи, заканчивающиеся на _open
    const key1 = Object.keys(data1).find(k => k.endsWith('_open'));
    const key2 = Object.keys(data2).find(k => k.endsWith('_open'));

    if (!key1 || !key2) {
      console.error("❌ Не найден ключ с окончанием '_open' в одном из файлов.");
      return;
    }

    const val1 = parseFloat(data1[key1]);
    const val2 = parseFloat(data2[key2]);

    if (isNaN(val1) || isNaN(val2)) {
      return;
    }

    if (val1 > val2) {
      await long_List();
    } else if (val1 < val2) {
      await short_List();
    }
    // Если равны — ничего не делаем

  } catch (err) {
  }
}

// Экспорт функции
export { check_closed_trend_add_next_candle };
