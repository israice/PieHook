import fs from 'fs/promises';
import yaml from 'yaml';
import { check_if_price_bigger_then_second_high } from '../../tools/check_if_price_bigger_then_second_high.js';

// === Конфигурация ===
const SETTINGS_FILE = './core/the_candle/config.yaml';
const LONG_VARIABLE = 'STATUS_OF_GREEN_CANDLE';
const TRIGGER_VALUE = 3;

// === Конец конфигурации ===

async function long_List() {
  await check_if_price_bigger_then_second_high();
}

async function SHORT_GREEN_3() {
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

export { SHORT_GREEN_3 };
