import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

// === Конфигурация ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SETTINGS_FILE = path.join(__dirname, '../../settings.yaml');
const CONFIG_FILE_PATH = path.join(__dirname, '../../core/the_candle/config.yaml');

const BINANCE_ACCOUNT_KEY = 'BINANCE_ACCOUNT';
const SYMBOLS_KEY = 'SYMBOLS';
const BUY_PERCENT_SETTINGS_KEY = 'BUY_PERCENT_RESET';
const CONFIG_PERCENT_LONG_BUY_KEY = 'PERCENT_LONG_BUY';
const CONFIG_PERCENT_SHORT_BUY_KEY = 'PERCENT_SHORT_BUY';

async function reset_settings_BUY_PERCENT_SETTINGS() {
  let settings;

  // Чтение settings.yaml
  try {
    const settingsText = await fs.readFile(SETTINGS_FILE, 'utf8');
    settings = yaml.parse(settingsText);
  } catch (err) {
    console.error(`❌ Ошибка при чтении ${SETTINGS_FILE}:`, err.message);
    return;
  }

  let account, symbol, buyValue;
  try {
    account = settings[BINANCE_ACCOUNT_KEY][0];
    symbol = settings[SYMBOLS_KEY][0];
    buyValue = settings[BUY_PERCENT_SETTINGS_KEY];

    if (buyValue === undefined) {
      console.error(`❌ Ключ ${BUY_PERCENT_SETTINGS_KEY} не найден в ${SETTINGS_FILE}`);
      return;
    }
  } catch (err) {
    console.error(`❌ Ошибка извлечения ключей из ${SETTINGS_FILE}:`, err.message);
    return;
  }

  // Чтение config.yaml как обычный текст
  let originalText;
  try {
    originalText = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
  } catch (err) {
    console.error(`❌ Ошибка при чтении ${CONFIG_FILE_PATH}:`, err.message);
    return;
  }

  const shortValue = buyValue;
  const longValue = (typeof buyValue === 'string' && !buyValue.startsWith('-'))
    ? '-' + buyValue
    : buyValue;

  // Заменяем строки напрямую
  let updatedText = originalText;

  const safeReplace = (key, newValue) => {
    const pattern = new RegExp(`^(${key}\\s*:\\s*)(.*)$`, 'm');
    if (pattern.test(updatedText)) {
      updatedText = updatedText.replace(pattern, `$1${newValue}`);
    }
  };

  safeReplace(CONFIG_PERCENT_SHORT_BUY_KEY, shortValue);
  safeReplace(CONFIG_PERCENT_LONG_BUY_KEY, longValue);

  try {
    await fs.writeFile(CONFIG_FILE_PATH, updatedText, 'utf8');
  } catch (err) {
    console.error(`❌ Ошибка при записи ${CONFIG_FILE_PATH}:`, err.message);
  }
}

export { reset_settings_BUY_PERCENT_SETTINGS };
