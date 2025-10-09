// 1. Читает настройки из settings.yaml
// 2. Определяет, где лежат файлы со свечами
// 3. Для каждого аккаунта и таймфрейма:
//    – проверяет, существует ли файл
//    – читает его содержимое
//    – берёт цены открытия, максимума, минимума и закрытия
//    – считает, на сколько процентов свеча поднялась или опустилась
//    – сохраняет новый процент в тот же файл
// 4. Если что-то не получилось, ждёт немного и пробует снова


// Импорт необходимых модулей с использованием ES-модулей
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

// Определяем __filename и __dirname для ES-модуля
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =======================
// КОНСТАНТЫ
// =======================

const SETTINGS_PATH = path.resolve(__dirname, '../../settings.yaml');
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const OUTPUT_BASE_PATH = path.join(PROJECT_ROOT, 'core', 'B_check', 'Binance');

const MAX_RETRIES = 1;
const INITIAL_DELAY = 0.1;

// =======================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =======================

function delay(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

function retryOnFailure(fn) {
  return async function (...args) {
    let retries = MAX_RETRIES;
    let delayTime = INITIAL_DELAY;
    while (true) {
      try {
        return await fn(...args);
      } catch (e) {
        if (retries === 0) throw e;
        retries -= 1;
        await delay(delayTime);
        delayTime *= 2;
      }
    }
  };
}

async function loadYamlFile(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`-- Ошибка: файл ${filePath} отсутствует.`);
  }
  const fileContent = await fs.readFile(filePath, 'utf8');
  return yaml.load(fileContent) || {};
}

const loadYaml = retryOnFailure(loadYamlFile);

async function saveYaml(filePath, data) {
  const yamlStr = yaml.dump(data);
  await fs.writeFile(filePath, yamlStr, 'utf8');
}

const saveYamlWithRetry = retryOnFailure(saveYaml);

function getFolderType(baseUrl) {
  if (baseUrl.includes('fapi')) return 'perpetual';
  if (baseUrl.includes('testnet')) return 'testnet';
  if (baseUrl.includes('api.binance.com')) return 'spot';
  return 'unknown';
}

function getCandleFilePath(account, folder, symbol, interval) {
  return path.join(
    OUTPUT_BASE_PATH,
    account,
    folder,
    symbol.toUpperCase(),
    `candle_${interval}.yaml`
  );
}

// =======================
// ОСНОВНАЯ ФУНКЦИЯ
// =======================

async function create_candles_percent() {
  let settings;
  try {
    settings = await loadYaml(SETTINGS_PATH);
  } catch (err) {
    console.error(err.message);
    return;
  }

  const settingsLower = {};
  for (const key in settings) {
    settingsLower[key.toLowerCase()] = settings[key];
  }

  if (!Array.isArray(settingsLower.symbols) || settingsLower.symbols.length === 0) {
    console.error("Ошибка: 'symbols' в settings.yaml отсутствует или не является списком.");
    return;
  }
  if (!settingsLower.timeframes || settingsLower.timeframes.length === 0) {
    console.error("Ошибка: отсутствует ключ 'timeframes' в settings.yaml.");
    return;
  }

  const symbols = settingsLower.symbols.map(s => s.toLowerCase());
  const timeframes = settingsLower.timeframes;
  const binanceAccounts = settings['BINANCE_ACCOUNT'];

  if (!binanceAccounts || !Array.isArray(binanceAccounts) || binanceAccounts.length === 0) {
    console.error("Ошибка: BINANCE_ACCOUNT отсутствует или не является списком в settings.yaml.");
    return;
  }

  const baseUrl = settings['BASE_URL'] || '';
  const folderType = getFolderType(baseUrl);

  for (let i = 0; i < binanceAccounts.length; i++) {
    const binanceAccount = binanceAccounts[i];
    const tf = i < timeframes.length ? timeframes[i] : timeframes[timeframes.length - 1];

    for (const symbol of symbols) {
      const filePath = getCandleFilePath(binanceAccount, folderType, symbol, tf);

      try {
        await fs.access(filePath);
      } catch {
        console.warn(`⚠️ Пропуск: файл ${filePath} не найден — сначала нужно получить свечи.`);
        continue;
      }

      let data;
      try {
        data = await loadYaml(filePath);
      } catch (e) {
        console.error(`Ошибка загрузки файла ${filePath}: ${e.message}`);
        continue;
      }

      const updateData = {};
      const regex = new RegExp(`^${symbol}@kline_${tf}_open(_\\d+)?$`);
      const suffixes = new Set();

      for (const key of Object.keys(data)) {
        const match = key.match(regex);
        if (match) {
          const suffix = match[1] ?? '';
          suffixes.add(suffix);
        }
      }

      for (const suffix of suffixes) {
        const o_key = `${symbol}@kline_${tf}_open${suffix}`;
        const c_key = `${symbol}@kline_${tf}_close${suffix}`;
        const h_key = `${symbol}@kline_${tf}_high${suffix}`;
        const l_key = `${symbol}@kline_${tf}_low${suffix}`;

        if (o_key in data && c_key in data && h_key in data && l_key in data) {
          try {
            const openPrice = parseFloat(data[o_key]);
            const closePrice = parseFloat(data[c_key]);
            const highPrice = parseFloat(data[h_key]);
            const lowPrice = parseFloat(data[l_key]);
            if (openPrice === 0) continue;

            let percentDiff = 0;
            if (openPrice < closePrice) {
              percentDiff = ((highPrice - openPrice) / openPrice) * 100;
            } else if (openPrice > closePrice) {
              percentDiff = -((openPrice - lowPrice) / openPrice) * 100;
            }

            const percent_key = `${symbol}@kline_${tf}_open_percent${suffix}`;
            updateData[percent_key] = `${percentDiff.toFixed(3)}%`;
          } catch (e) {
            console.error(`Ошибка вычислений для ${symbol} ${tf}${suffix}: ${e.message}`);
            continue;
          }
        }
      }

      if (Object.keys(updateData).length > 0) {
        Object.assign(data, updateData);
        try {
          await saveYamlWithRetry(filePath, data);
        } catch (e) {
          console.error(`Ошибка сохранения файла ${filePath}: ${e.message}`);
        }
      }
    }
  }
}

// Автоматический запуск при прямом вызове
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  create_candles_percent();
}

// Экспорт
export { create_candles_percent };
