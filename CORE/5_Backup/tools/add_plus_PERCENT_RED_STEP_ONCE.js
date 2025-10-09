import fs from 'fs/promises';
import { load } from 'js-yaml';

// === НАСТРОЙКИ ===
const CONFIG_FILE   = 'core/the_candle/config.yaml';
const CONFIG_KEY    = 'PERCENT_LONG_BUY';
const SETTINGS_KEY  = 'BUY_PERCENT_SETTINGS';

async function add_plus_PERCENT_RED_STEP_ONCE() {
  try {
    // 1) читаем config.yaml
    const configRaw  = await fs.readFile(CONFIG_FILE, 'utf8');
    const configData = load(configRaw);

    const current = parseFloat(String(configData[CONFIG_KEY]).replace('%', ''));
    const step    = parseFloat(String(configData[SETTINGS_KEY]).replace('%', ''));

    const newValue = `${(current - step).toFixed(3)}%`; // уменьшаем значение на шаг

    // 2) заменяем только строку с CONFIG_KEY
    const updated = configRaw
      .split(/\r?\n/)
      .map(line =>
        line.match(new RegExp(`^\\s*${CONFIG_KEY}\\s*:`))
          ? line.replace(/:.*/, `: ${newValue}`)
          : line
      )
      .join('\n');

    await fs.writeFile(CONFIG_FILE, updated, 'utf8');
  } catch (err) {
    console.error('❌ Ошибка при обновлении PERCENT_SHORT_SELL:', err);
  }
}

export { add_plus_PERCENT_RED_STEP_ONCE };
