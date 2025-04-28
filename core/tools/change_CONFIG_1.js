// Импорт модулей
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Получаем __dirname для ES-модуля
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к settings.yaml
const SETTINGS_PATH = path.resolve(__dirname, '../../settings.yaml');

// Основная функция
async function change_CONFIG_1() {
  try {
    // Чтение исходного содержимого файла
    const content = await fs.readFile(SETTINGS_PATH, 'utf8');

    // Замена строки с CONFIG, без трогания остальных
    const updated = content.replace(
      /^(\s*CONFIG\s*:\s*).*/m,
      '$11'
    );

    // Запись обратно в файл
    await fs.writeFile(SETTINGS_PATH, updated, 'utf8');
  } catch (err) {
    console.error('❌ Ошибка при обновлении CONFIG:', err.message);
  }
}

// Экспорт
export { change_CONFIG_1 };
