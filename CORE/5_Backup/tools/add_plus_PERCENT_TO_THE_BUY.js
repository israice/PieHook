import fs from 'fs/promises';
import { load } from 'js-yaml';

// === НАСТРОЙКИ ===
const CANDLE_FILE         = 'core/the_candle/candle.yaml';
const CONFIG_FILE         = 'core/the_candle/config.yaml';
const OPEN_PERCENT_SUFFIX = '_open_percent';
const SETTINGS_KEY        = 'BUY_PERCENT_SETTINGS';
const KEY_LONG            = 'PERCENT_LONG_BUY';   // всегда отрицательное
const KEY_SHORT           = 'PERCENT_SHORT_BUY';  // всегда положительное

async function add_plus_PERCENT_TO_THE_BUY() {
  try {

    // === Читаем candle.yaml ===
    const candleRaw = await fs.readFile(CANDLE_FILE, 'utf8');
    const candleData = load(candleRaw);
    const openKey = Object.keys(candleData).find(k => k.endsWith(OPEN_PERCENT_SUFFIX));
    if (!openKey) {
      console.error(`❌ Не найден ключ с окончанием "${OPEN_PERCENT_SUFFIX}"`);
      return;
    }

    const threshold = parseFloat(String(candleData[openKey]).replace('%', '').trim());
    if (isNaN(threshold)) {
      console.error(`❌ Значение свечи не число: ${candleData[openKey]}`);
      return;
    }


    // === Читаем config.yaml ===
    const configRaw = await fs.readFile(CONFIG_FILE, 'utf8');
    const configData = load(configRaw);

    const step = Math.abs(parseFloat(String(configData[SETTINGS_KEY]).replace('%', '').trim()));
    if (isNaN(step)) {
      console.error(`❌ BUY_PERCENT_SETTINGS не число: ${configData[SETTINGS_KEY]}`);
      return;
    }

    const lines = configRaw.split(/\r?\n/);

    // === Проверка SHORT: если threshold > SHORT → увеличиваем SHORT
    let short = parseFloat(String(configData[KEY_SHORT]).replace('%', '').trim());
    if (threshold > short) {

      while (short < threshold) {
        short += step;
      }

      const newVal = `${short.toFixed(3)}%`;
      updateLine(lines, KEY_SHORT, newVal);
    }

    // === Проверка LONG: если threshold < LONG → уменьшаем LONG
    let long = parseFloat(String(configData[KEY_LONG]).replace('%', '').trim());
    if (threshold < long) {

      while (long > threshold) {
        long -= step;
      }

      const newVal = `${long.toFixed(3)}%`;
      updateLine(lines, KEY_LONG, newVal);
    }

    // === Запись обратно
    await fs.writeFile(CONFIG_FILE, lines.join('\n'), 'utf8');

  } catch (err) {
    console.error('❌ Ошибка:', err);
  }
}

// === ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ===
function updateLine(lines, key, newValue) {
  const index = lines.findIndex(line => line.trim().startsWith(`${key}:`));
  if (index !== -1) {
    lines[index] = `${key}: ${newValue}`;
  } else {
    console.warn(`⚠️ Ключ не найден в config: ${key}`);
  }
}

export { add_plus_PERCENT_TO_THE_BUY };
