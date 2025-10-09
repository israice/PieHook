import fs from 'fs/promises';
import path from 'path';

// === НАСТРОЙКИ ===
const SETTINGS_FILE_NAME = 'settings.yaml';
const TARGET_FILE_NAME = 'orders_collection.yaml';
const SETTINGS_KEY = 'QUANTITY_SETTINGS';

const SETTINGS_FILE = path.join(process.cwd(), SETTINGS_FILE_NAME);
const TARGET_FILE = path.join(process.cwd(), TARGET_FILE_NAME);

async function update_body_using_QUANTITY_SETTINGS() {
  try {
    // Читаем settings.yaml
    const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf8');
    const settingsMatch = settingsContent.match(
      new RegExp(`^${SETTINGS_KEY}\\s*:\\s*(.+)$`, 'm')
    );
    if (!settingsMatch) {
      throw new Error(`❌ Переменная ${SETTINGS_KEY} не найдена в ${SETTINGS_FILE_NAME}`);
    }
    const quantityBase = parseFloat(settingsMatch[1].trim());

    // Вычисляем итоговое значение без умножения на LEVERAGE
    const finalQuantity = Number(quantityBase).toFixed(2); // только 2 знака

    // Читаем orders_collection.yaml
    const targetContent = await fs.readFile(TARGET_FILE, 'utf8');

    // Заменяем все quantity: ... на новое значение без кавычек
    const updatedContent = targetContent.replace(
      /^(\s*quantity\s*:\s*).+$/gim,
      `$1${finalQuantity}`
    );

    // Записываем обратно
    await fs.writeFile(TARGET_FILE, updatedContent, 'utf8');
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  }
}

// === ЭКСПОРТ ===
export { update_body_using_QUANTITY_SETTINGS };
