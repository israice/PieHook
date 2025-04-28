import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = 'settings.yaml';
const CONFIG_FILE = path.join('core', 'the_candle', 'config.yaml');
const TARGET_KEY = 'STATUS_OF_GREEN_CANDLE';
const MAX_KEY = 'AMMOUNT_OF_GET_CANDLES';

async function add_plus_1_to_GREEN_candle_status_and_1() {
  try {
    const [settingsText, configText] = await Promise.all([
      fs.readFile(SETTINGS_FILE, 'utf8'),
      fs.readFile(CONFIG_FILE, 'utf8')
    ]);

    // Ищем значение потолка
    const settingsMatch = settingsText.match(new RegExp(`^${MAX_KEY}\\s*:\\s*(\\d+)`, 'm'));
    if (!settingsMatch) throw new Error(`❌ Не найден ключ ${MAX_KEY} в settings.yaml`);
    const max = parseInt(settingsMatch[1]);

    // Обновляем значение в config.yaml
    const updated = configText.replace(
      new RegExp(`^(${TARGET_KEY}\\s*:\\s*)(\\d+)(\\s*)$`, 'm'),
      (_, prefix, number, suffix) => {
        const current = parseInt(number);
        const next = Math.min(current + 1, max);
        return `${prefix}${next}${suffix}`;
      }
    );

    // Запись, только если что-то поменялось
    if (updated !== configText) {
      await fs.writeFile(CONFIG_FILE, updated, 'utf8');
    }
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  }
}

export { add_plus_1_to_GREEN_candle_status_and_1 };
