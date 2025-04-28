import { readFile, writeFile } from 'fs/promises';
import path from 'path';

// === НАСТРОЙКИ ===
const CONFIG_FILE_PATH = path.join('core', 'the_candle', 'config.yaml');
const SETTINGS_FILE_PATH = path.join('settings.yaml');
const CONFIG_VARIABLE = 'QUANTITY_SHORT_BUY_STEP';
const SETTINGS_VARIABLE = 'NEXT_QUANTITY_STEP_SETTINGS';
// === КОНЕЦ НАСТРОЕК ===

/**
 * Асинхронно обновляет значение CONFIG_VARIABLE в config.yaml
 * на значение из SETTINGS_VARIABLE в settings.yaml.
 */
async function reset_settings_QUANTITY_SHORT_BUY_STEP() {
  try {
    const settingsContent = await readFile(SETTINGS_FILE_PATH, 'utf8');

    const settingsRegex = new RegExp(`^${SETTINGS_VARIABLE}:\\s*(\\S+)`, 'm');
    const settingsMatch = settingsContent.match(settingsRegex);
    if (!settingsMatch) {
      throw new Error(`❌ Переменная ${SETTINGS_VARIABLE} не найдена в ${SETTINGS_FILE_PATH}`);
    }
    const quantitySellStep = settingsMatch[1];

    const configContent = await readFile(CONFIG_FILE_PATH, 'utf8');
    const configRegex = new RegExp(`^(${CONFIG_VARIABLE}:\\s*).+$`, 'm');
    const updatedConfigContent = configContent.replace(configRegex, `$1${quantitySellStep}`);

    await writeFile(CONFIG_FILE_PATH, updatedConfigContent, 'utf8');
  } catch (error) {
    console.error('❌ Ошибка при обновлении файла:', error.message);
  }
}

export { reset_settings_QUANTITY_SHORT_BUY_STEP };
