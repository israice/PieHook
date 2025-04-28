import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// === Константы ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.join(__dirname, '..', 'B_check', 'Binance');
const TEMPLATE_FILE = path.join(BASE_DIR, 'config_TEMPLATE.yaml'); // используется только как проверка
const CATEGORIES = ['perpetual', 'spot', 'testnet'];

// === Основная обработка папки аккаунта (например, REAL1, REAL3 и т.п.) ===
async function processDynamicFolder(dynamicFolderPath) {
  for (const category of CATEGORIES) {
    const categoryPath = path.join(dynamicFolderPath, category);
    if (!fsSync.existsSync(categoryPath)) continue;

    const subfolders = await fs.readdir(categoryPath);
    for (const subfolder of subfolders) {
      const subfolderPath = path.join(categoryPath, subfolder);
      const stats = await fs.stat(subfolderPath);
      if (!stats.isDirectory()) continue;

      const files = await fs.readdir(subfolderPath);
      for (const file of files) {
        if (file.startsWith('candle_') && file.endsWith('.yaml')) {
          const source = path.join(subfolderPath, file);
          const destination = path.join(subfolderPath, 'old_' + file);
          try {
            await fs.copyFile(source, destination);
          } catch (e) {
            console.warn(`⚠️ Не удалось скопировать ${file}:`, e.message);
          }
        }
      }
    }
  }
}

// === Основная функция копирования всех candle-файлов ===
async function clone_old_data() {
  if (!fsSync.existsSync(TEMPLATE_FILE)) return;

  const items = await fs.readdir(BASE_DIR);
  for (const item of items) {
    const itemPath = path.join(BASE_DIR, item);
    const stats = await fs.stat(itemPath);
    if (stats.isDirectory()) {
      await processDynamicFolder(itemPath);
    }
  }
}

// === Автоматический запуск при прямом вызове ===
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  clone_old_data().catch(console.error);
}

// === Экспорт для использования из других модулей ===
export { clone_old_data };
