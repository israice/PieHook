import fs from 'fs/promises';
import yaml from 'yaml';
import { check_closed_LONG_GREEN_2 } from './ACAA_check_closed_LONG_GREEN_2.js';
import { percent_of_long_sell } from './percent_of_long_sell.js';

// === Конфигурация ===
const SETTINGS_FILE = './core/the_candle/config.yaml';
const LONG_VARIABLE = 'STATUS_OF_GREEN_CANDLE';
const TRIGGER_VALUE = 2;

// === Конец конфигурации ===

async function long_List() {
  await check_closed_LONG_GREEN_2();
  await percent_of_long_sell();
}

async function LONG_GREEN_2() {
  try {
    const content = await fs.readFile(SETTINGS_FILE, 'utf8');
    const config = yaml.parse(content);

    if (!(LONG_VARIABLE in config)) {
      console.error(`❌ Ошибка: переменная ${LONG_VARIABLE} не найдена в ${SETTINGS_FILE}`);
      return;
    }

    if (config[LONG_VARIABLE] === TRIGGER_VALUE) {
      await long_List();
    }

    // если значение не соответствует TRIGGER_VALUE — ничего не делаем
  } catch (err) {
    console.error(`❌ Ошибка при чтении ${SETTINGS_FILE}:`, err.message);
  }
}

export { LONG_GREEN_2 };
