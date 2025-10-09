// === НАСТРОЙКИ ===
import fs from 'fs/promises';
import path from 'path';

// Абсолютный путь к папке, в которой искать
const TARGET_DIR = path.join('core', 'B_check', 'Binance');
const FOLDER_PREFIX = 'REAL';

// === ОСНОВНАЯ ФУНКЦИЯ ===
async function delete_previus_session() {
  try {
    const fullPath = path.resolve(TARGET_DIR);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });


    const foldersToDelete = entries
      .filter(entry => entry.isDirectory() && entry.name.startsWith(FOLDER_PREFIX))
      .map(entry => path.join(fullPath, entry.name));

    await Promise.all(
      foldersToDelete.map(folderPath => fs.rm(folderPath, { recursive: true, force: true }))
    );

  } catch (error) {
    console.error('❌ Ошибка при удалении папок:', error.message);
  }
}

// === ЭКСПОРТ ===
export { delete_previus_session };
