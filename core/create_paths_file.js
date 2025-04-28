// 1. Находит корень проекта по наличию settings.yaml  
// 2. Считывает настройки из settings.yaml  
// 3. Собирает полный список папок для каждого аккаунта, символа и таймфрейма  
// 4. Приводит все пути к единому формату и обрезает до папки Binance  
// 5. Сравнивает новый список путей с тем, что уже в the_paths.yaml  
// 6. Если что изменилось или счётчик не ноль, сбрасывает счётчик и сохраняет новые пути  

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import yaml from 'yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ищем корень проекта по наличию settings.yaml
function findProjectRoot(startDir) {
  let dir = startDir;
  while (true) {
    if (fsSync.existsSync(path.join(dir, 'settings.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Не удалось найти корень проекта (settings.yaml)');
}

const PROJECT_ROOT    = findProjectRoot(__dirname);
const DRIVE_ROOT      = path.parse(PROJECT_ROOT).root;
const OUTPUT_BASE_DIR = path.join(PROJECT_ROOT, 'core', 'B_check', 'Binance');
const THE_PATHS_FILE  = path.join(PROJECT_ROOT, 'core', 'B_check', 'the_paths.yaml');

// Нормализует путь к единообразному виду
function normalizePath(p) {
  return path.normalize(p).replace(/\\/g, '/');
}

// Проверяет, начинается ли каждый путь с базового каталога
function allPathsHaveBase(paths, base) {
  const normBase = normalizePath(base);
  return paths.every(p => normalizePath(p).startsWith(normBase));
}

// Обрезает всё до заданной папки (включительно)
function stripBeforeFolder(p, folderName) {
  const norm = normalizePath(p);
  const parts = norm.split('/');
  const idx = parts.indexOf(folderName);
  if (idx >= 0) return parts.slice(idx).join('\\');
  // если не нашли, вернуть с обратными слешами полностью
  return norm.replace(/\//g, '\\');
}

async function loadSettings() {
  try {
    const content = await fs.readFile(path.join(PROJECT_ROOT, 'settings.yaml'), 'utf8');
    return yaml.parse(content) || {};
  } catch (err) {
    console.error(`❌ Ошибка загрузки settings.yaml`, err);
    return null;
  }
}

async function writePathsToYaml(absolutePaths) {
  if (!Array.isArray(absolutePaths) || absolutePaths.length === 0) {
    console.error('❌ Массив путей пуст или не является массивом.');
    return;
  }

  // Формируем displayPaths начиная с папки 'Binance'
  const baseFolderName = path.basename(OUTPUT_BASE_DIR);
  const displayPaths = absolutePaths.map(p => stripBeforeFolder(p, baseFolderName));

  let existingData = {};
  if (fsSync.existsSync(THE_PATHS_FILE)) {
    try {
      const content = await fs.readFile(THE_PATHS_FILE, 'utf8');
      existingData = yaml.parse(content) || {};
    } catch (err) {
      console.error(`❌ Ошибка чтения ${THE_PATHS_FILE}`, err);
    }
  }

  const oldPaths   = Array.isArray(existingData.the_paths) ? existingData.the_paths : [];
  const oldCounter = typeof existingData.counter === 'number'   ? existingData.counter   : null;

  // Сравниваем нормализованные списки
  const normOld = oldPaths.map(p => normalizePath(p));
  const normNew = displayPaths.map(p => normalizePath(p));
  const identical = normOld.length === normNew.length && normOld.every((v, i) => v === normNew[i]);

  if (identical && allPathsHaveBase(absolutePaths, OUTPUT_BASE_DIR) && oldCounter === 0) {
    return; // Нет изменений
  }

  const updatedData = { ...existingData, counter: 1, the_paths: displayPaths };
  const yamlString  = yaml.stringify(updatedData);

  try {
    await fs.mkdir(path.dirname(THE_PATHS_FILE), { recursive: true });
    await fs.writeFile(THE_PATHS_FILE, yamlString, 'utf8');
  } catch (err) {
    console.error(`❌ Ошибка при записи файла ${THE_PATHS_FILE}`, err);
  }
}

// Генерация списка путей для разных аккаунтов и таймфреймов
async function create_paths_file() {
  const settings = await loadSettings();
  if (!settings) return;

  const lower = Object.fromEntries(
    Object.entries(settings).map(([k, v]) => [k.toLowerCase(), v])
  );

  const allSymbols = Array.isArray(lower.symbols)
    ? lower.symbols.map(s => s.toLowerCase())
    : [];
  if (!allSymbols.length) {
    console.error('❌ Не указаны symbols в settings.yaml');
    return;
  }

  let allTimeframes = lower.timeframes;
  if (!allTimeframes) {
    console.error('❌ Не указаны timeframes в settings.yaml');
    return;
  }
  if (typeof allTimeframes === 'string') {
    allTimeframes = [allTimeframes];
  }

  const binanceAccounts = settings.BINANCE_ACCOUNT;
  if (!Array.isArray(binanceAccounts) || binanceAccounts.length === 0) {
    console.error('❌ Не указаны BINANCE_ACCOUNT в settings.yaml');
    return;
  }

  const baseUrl    = settings.BASE_URL || '';
  const folderType = baseUrl.includes('fapi') ? 'perpetual'
                    : baseUrl.includes('testnet') ? 'testnet'
                    : baseUrl.includes('api.binance.com') ? 'spot'
                    : 'unknown';
  const paths = [];

  if (binanceAccounts.length === 1) {
    const account = binanceAccounts[0];
    for (const symbol of allSymbols) {
      for (const tf of allTimeframes) {
        paths.push(path.join(OUTPUT_BASE_DIR, account, folderType, symbol.toUpperCase(), tf));
      }
    }
  } else {
    for (let i = 0; i < binanceAccounts.length; i++) {
      const account = binanceAccounts[i];
      const tf      = allTimeframes[i] || allTimeframes[allTimeframes.length - 1];
      for (const symbol of allSymbols) {
        paths.push(path.join(OUTPUT_BASE_DIR, account, folderType, symbol.toUpperCase(), tf));
      }
    }
  }

  await writePathsToYaml(paths);
}

export { create_paths_file };