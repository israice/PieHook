import fs from 'fs/promises';
import path from 'path';

const SOURCE_FILE = path.join('core', 'B_check', 'the_paths.yaml');
const TARGET_FILE = 'orders_collection.yaml';

function extractSymbolFromPath(filePath) {
  const parts = filePath.split('\\');
  return parts.at(-2);
}

async function reset_body_symbol_via_settings() {
  try {
    const sourceText = await fs.readFile(SOURCE_FILE, 'utf8');

    const counterMatch = sourceText.match(/^counter:\s*(\d+)/m);
    const pathsMatch = [...sourceText.matchAll(/^\s*-\s*(.+)$/gm)];

    if (!counterMatch || pathsMatch.length === 0) {
      throw new Error('❌ Некорректный counter или пустой список путей');
    }

    const counter = parseInt(counterMatch[1]);
    const paths = pathsMatch.map(m => m[1].trim());

    if (counter < 1 || counter > paths.length) {
      throw new Error('❌ counter вне диапазона списка путей');
    }

    const correctSymbol = extractSymbolFromPath(paths[counter - 1]).trim();

    const originalText = await fs.readFile(TARGET_FILE, 'utf8');

    // Проверка наличия хотя бы одного отличающегося symbol
    const hasWrongSymbol = originalText.split('\n').some(line =>
      line.match(/^\s*symbol\s*:\s*(.+)$/i)?.[1].trim() !== correctSymbol
    );

    if (!hasWrongSymbol) {
      console.log('ℹ️ Все symbol уже верны. Ничего не изменено.');
      return;
    }

    // Гарантированно заменяем ВСЕ symbol на корректный
    const updatedText = originalText.replace(
      /^(\s*symbol\s*:\s*)(.+)$/gim,
      `$1${correctSymbol}`
    );

    await fs.writeFile(TARGET_FILE, updatedText, 'utf8');
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  }
}

export { reset_body_symbol_via_settings };
