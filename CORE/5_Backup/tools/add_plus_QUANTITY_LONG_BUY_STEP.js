import { readFile, writeFile } from 'fs/promises';
import path from 'path';

// === НАСТРОЙКИ ===
const CONFIG_FILE_PATH = path.join('core', 'the_candle', 'config.yaml');
const SETTINGS_FILE_PATH = path.join('settings.yaml');
const CONFIG_VARIABLE = 'QUANTITY_LONG_BUY_STEP';
const SETTINGS_VARIABLE = 'NEXT_QUANTITY_STEP_SETTINGS';
// === КОНЕЦ НАСТРОЕК ===

/**
 * Асинхронная функция, которую можно вызывать через await
 */
async function add_plus_QUANTITY_LONG_BUY_STEP() {
  // Читаем settings.yaml
  const settingsContent = await readFile(SETTINGS_FILE_PATH, 'utf8');
  const settingsRegex = new RegExp(`${SETTINGS_VARIABLE}:\\s*([0-9]*\\.?[0-9]+)`);
  const settingsMatch = settingsContent.match(settingsRegex);
  if (!settingsMatch) {
    throw new Error(`❌ Переменная ${SETTINGS_VARIABLE} не найдена в ${SETTINGS_FILE_PATH}`);
  }
  const additionalValue = parseFloat(settingsMatch[1]);

  // Читаем config.yaml
  const configContent = await readFile(CONFIG_FILE_PATH, 'utf8');
  const configRegex = new RegExp(`(${CONFIG_VARIABLE}:\\s*)([0-9]*\\.?[0-9]+)`);
  const configMatch = configContent.match(configRegex);
  if (!configMatch) {
    throw new Error(`❌ Переменная ${CONFIG_VARIABLE} не найдена в ${CONFIG_FILE_PATH}`);
  }
  const oldValue = parseFloat(configMatch[2]);
  const newValue = Math.round((oldValue + additionalValue) * 100) / 100;

  // Заменяем значение
  const updatedContent = configContent.replace(configRegex, `$1${newValue}`);

  // Сохраняем изменения
  await writeFile(CONFIG_FILE_PATH, updatedContent, 'utf8');

}

export { add_plus_QUANTITY_LONG_BUY_STEP };
