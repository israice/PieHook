import fs from 'fs/promises';
import { load } from 'js-yaml';

// === НАСТРОЙКИ ===
const CANDLE_FILE         = 'core/the_candle/candle.yaml';
const CONFIG_FILE         = 'core/the_candle/config.yaml';
const OPEN_PERCENT_SUFFIX = '_open_percent';
const CONFIG_KEY          = 'PERCENT_LONG_BUY';
const SETTINGS_KEY        = 'BUY_PERCENT_SETTINGS';

async function add_plus_PERCENT_LONG_BUY() {
  try {
    // 1) читаем candle.yaml и находим ключ *_open_percent
    const candleRaw  = await fs.readFile(CANDLE_FILE, 'utf8');
    const candleData = load(candleRaw);
    const openKey    = Object.keys(candleData).find(k => k.endsWith(OPEN_PERCENT_SUFFIX));
    if (!openKey) {
      console.error(`❌ Не найден ключ с суффиксом "${OPEN_PERCENT_SUFFIX}" в ${CANDLE_FILE}`);
      return;
    }
    const threshold = parseFloat(String(candleData[openKey]).replace('%', ''));

    // 2) читаем config.yaml
    const configRaw  = await fs.readFile(CONFIG_FILE, 'utf8');
    const configData = load(configRaw);
    let current = parseFloat(String(configData[CONFIG_KEY]).replace('%', ''));
    const step    = parseFloat(String(configData[SETTINGS_KEY]).replace('%', ''));

    // 3) если threshold ниже (более отрицательное), то итеративно вычитаем шаг
    if (threshold < current) {
      while (current > threshold) {
        current -= step;
      }
      const newValue = `${current.toFixed(3)}%`;

      // 4) заменяем только строку с CONFIG_KEY, не трогая остальной файл
      const updated = configRaw
        .split(/\r?\n/)
        .map(line => line.match(new RegExp(`^${CONFIG_KEY}\s*:`))
          ? `${CONFIG_KEY}: ${newValue}`
          : line
        )
        .join('\n');

      await fs.writeFile(CONFIG_FILE, updated, 'utf8');
    } else {
    }
  } catch (err) {
    console.error('❌ Ошибка при обновлении PERCENT_LONG_BUY:', err);
  }
}

export { add_plus_PERCENT_LONG_BUY };