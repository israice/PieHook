import fs from 'fs/promises';
import path from 'path';

const FILES_TO_CLEAR = [
  path.join('core', 'the_candle', 'candle.yaml'),
  path.join('core', 'the_candle', 'config.yaml'),
  path.join('core', 'the_candle', 'old_candle.yaml')
];

async function clear_front_files() {
  try {
    for (const filePath of FILES_TO_CLEAR) {
      await fs.writeFile(filePath, '', 'utf8');
    }
  } catch (error) {
    console.error(`❌ Ошибка при очистке файлов:`, error);
  }
}

export { clear_front_files };
