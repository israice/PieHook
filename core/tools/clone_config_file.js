// Импорт модулей
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import { findUp } from 'find-up';

// __filename и __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Автоопределение project root ===
const SETTINGS_FILE = await findUp('settings.yaml', { cwd: __dirname });

if (!SETTINGS_FILE) {
  throw new Error('❌ settings.yaml не найден!');
}

const projectRoot = path.dirname(SETTINGS_FILE);

// === Константы ===
const KEY_SYMBOLS = 'SYMBOLS';
const KEY_TIMEFRAMES = 'TIMEFRAMES';
const KEY_BINANCE_ACCOUNT = 'BINANCE_ACCOUNT';
const KEY_BASE_URL = 'BASE_URL';

const TEMPLATE_FILENAME = 'config_TEMPLATE.yaml';
const TEMPLATE_PATH = path.join(projectRoot, 'core', 'B_check', 'Binance', TEMPLATE_FILENAME);

// === Загрузка настроек ===
async function loadSettings() {
  const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
  const settings = yaml.parse(content) || {};

  return {
    symbols: settings[KEY_SYMBOLS] || [],
    timeframes: settings[KEY_TIMEFRAMES] || [],
    accounts: settings[KEY_BINANCE_ACCOUNT] || [],
    baseUrl: settings[KEY_BASE_URL] || '',
  };
}

// === Определение подпапки по BASE_URL ===
function getFolderType(baseUrl) {
  if (baseUrl.includes('fapi')) return 'perpetual';
  if (baseUrl.includes('testnet')) return 'testnet';
  if (baseUrl.includes('api.binance.com')) return 'spot';
  return 'unknown';
}

// === Копирование файла ===
async function createConfigFile(targetPath, templatePath) {
  try {
    await fs.copyFile(templatePath, targetPath);
  } catch (err) {
    console.error(`Ошибка копирования в ${targetPath}:`, err);
  }
}

// === Главная функция ===
async function clone_config_file() {
  try {
    const { symbols, timeframes, accounts, baseUrl } = await loadSettings();

    if (!accounts.length) return console.log('❌ BINANCE_ACCOUNT пуст!');
    if (!symbols.length) return console.log('❌ SYMBOLS пуст!');
    if (!timeframes.length) return console.log('❌ TIMEFRAMES пуст!');
    if (!fsSync.existsSync(TEMPLATE_PATH)) {
      return console.log(`❌ Шаблонный файл не найден: ${TEMPLATE_PATH}`);
    }

    const folderType = getFolderType(baseUrl);
    const mkdirSet = new Set();
    const copyTasks = [];

    if (accounts.length === 1) {
      const account = accounts[0];

      for (const symbol of symbols) {
        const symbolDir = path.join(projectRoot, 'core', 'B_check', 'Binance', account, folderType, symbol.toUpperCase());
        mkdirSet.add(symbolDir);

        for (const timeframe of timeframes) {
          const targetFile = path.join(symbolDir, `config_${timeframe}.yaml`);
          copyTasks.push(() => createConfigFile(targetFile, TEMPLATE_PATH));
        }
      }
    } else {
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const timeframe = i < timeframes.length ? timeframes[i] : timeframes[timeframes.length - 1];

        for (const symbol of symbols) {
          const symbolDir = path.join(projectRoot, 'core', 'B_check', 'Binance', account, folderType, symbol.toUpperCase());
          mkdirSet.add(symbolDir);

          const targetFile = path.join(symbolDir, `config_${timeframe}.yaml`);
          copyTasks.push(() => createConfigFile(targetFile, TEMPLATE_PATH));
        }
      }
    }

    // Сначала создаём все уникальные папки
    await Promise.all([...mkdirSet].map(dir => fs.mkdir(dir, { recursive: true })));

    // Потом копируем все файлы
    await Promise.all(copyTasks.map(fn => fn()));

  } catch (err) {
    console.error('❌ Ошибка выполнения:', err);
  }
}

// Экспорт функции
export { clone_config_file };
