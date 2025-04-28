// 1. Подключает библиотеки и устанавливает общие пути
// 2. Считывает настройки из settings.yaml
// 3. Определяет, куда и как отправлять запросы к Binance
// 4. Для каждого аккаунта, символа и таймфрейма:
//    – загружает данные свечей (ежемесячно или по лимиту)  
//    – преобразует их в объекты с нужными полями  
//    – сохраняет или обновляет YAML-файл с результатами
// 5. Выполняет все запросы одновременно и ждёт завершения  

// Импорт модулей
import fetch from "node-fetch";
import fs from "fs/promises";
import path, { dirname } from "path";
import yaml from "yaml";
import { fileURLToPath } from "url";

// === УНИВЕРСАЛЬНЫЕ ПУТИ ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../../../");

const SETTINGS_FILE = path.join(PROJECT_ROOT, "settings.yaml");
const OUTPUT_BASE_PATH = path.join(PROJECT_ROOT, "core", "B_check", "Binance");

// === КОНСТАНТЫ ===
const AGGREGATED_TIMEFRAMES = new Set(["1Y", "6M", "3M", "1M"]);
const RETRY_DELAY = 1000;

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
const shouldQuote = (key) => {
  const lowerKey = key.toLowerCase();
  return !(lowerKey.includes("time") || lowerKey.includes("date"));
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loadSettings = async () => {
  try {
    const fileContent = await fs.readFile(SETTINGS_FILE, "utf-8");
    const settings = yaml.parse(fileContent) || {};
    settings.SYMBOLS = settings.SYMBOLS ?? [];
    settings.TIMEFRAMES = settings.TIMEFRAMES ?? [];
    settings.AMMOUNT_OF_GET_CANDLES = 1;
    settings.BINANCE_ACCOUNT = settings.BINANCE_ACCOUNT ?? [];
    settings.BASE_URL = settings.BASE_URL ?? "";
    return settings;
  } catch (err) {
    console.error(`❌ Не удалось прочитать файл настроек: ${SETTINGS_FILE}`);
    throw err;
  }
};

const getFolderType = (baseUrl) => {
  if (baseUrl.includes("fapi")) return "perpetual";
  if (baseUrl.includes("testnet")) return "testnet";
  if (baseUrl.includes("api.binance.com")) return "spot";
  return "unknown";
};

const getEndpoint = (baseUrl) => {
  if (baseUrl.includes("fapi") || baseUrl.includes("testnet"))
    return "/fapi/v1/klines";
  if (baseUrl.includes("api.binance.com")) return "/api/v3/klines";
  return "/fapi/v1/klines";
};

const getPeriodStart = (interval, now) => {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  switch (interval) {
    case "1Y":
      return new Date(Date.UTC(year, 0, 1));
    case "6M":
      return new Date(Date.UTC(year, month < 6 ? 0 : 6, 1));
    case "3M":
      return new Date(Date.UTC(year, Math.floor(month / 3) * 3, 1));
    case "1M":
      return new Date(Date.UTC(year, month, 1));
    default:
      return new Date();
  }
};

const aggregateMonthlyCandles = (candles, start, now) => {
  const open = candles[0][1];
  const close = candles[candles.length - 1][4];
  const high = Math.max(...candles.map((c) => parseFloat(c[2])));
  const low = Math.min(...candles.map((c) => parseFloat(c[3])));
  const volume = candles.reduce((sum, c) => sum + parseFloat(c[5]), 0);
  return {
    t: start.getTime(),
    o: open,
    h: high.toString(),
    l: low.toString(),
    c: close,
    v: volume.toString(),
    T: now.getTime(),
  };
};

const processCandleData = (stream, kline, suffix = "") => ({
  [`${stream}_open_time${suffix}`]: new Date(kline.t).toISOString(),
  [`${stream}_open${suffix}`]: kline.o,
  [`${stream}_high${suffix}`]: kline.h,
  [`${stream}_low${suffix}`]: kline.l,
  [`${stream}_close${suffix}`]: kline.c,
  [`${stream}_volume${suffix}`]: kline.v,
  [`${stream}_close_time${suffix}`]: new Date(kline.T).toISOString(),
  [`${stream}_server_response_time${suffix}`]: new Date().toISOString(),
});

const saveToFile = async (data, account, folder, symbol, interval) => {
  if (!data || Object.keys(data).length === 0) {
    console.warn(`⚠️ Пропуск записи: нет данных для ${symbol} ${interval}`);
    return;
  }

  const outPath = path.join(
    OUTPUT_BASE_PATH,
    account,
    folder,
    symbol.toUpperCase(),
    `candle_${interval}.yaml`
  );

  let fileExists = true;
  let content;
  try {
    content = await fs.readFile(outPath, "utf-8");
  } catch (err) {
    fileExists = false;
  }

  if (fileExists) {
    const lines = content.split("\n");
    const updatedLines = [];

    for (const key in data) {
      const regex = new RegExp(
        `^(\\s*${key}\\s*:\\s*)(['"])?(.*?)(['"])?(\\s*(#.*))?$`
      );
      let found = false;
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          const commentMatch = lines[i].match(/(\s*(#.*))?$/);
          const comment = commentMatch ? commentMatch[0] : "";
          let newLine;
          if (shouldQuote(key)) {
            newLine = `${key}: '${data[key]}'${comment}`;
          } else {
            newLine = `${key}: ${data[key]}${comment}`;
          }
          lines.splice(i, 1);
          updatedLines.push(newLine);
          found = true;
          break;
        }
      }
      if (!found) {
        let newLine;
        if (shouldQuote(key)) {
          newLine = `${key}: '${data[key]}'`;
        } else {
          newLine = `${key}: ${data[key]}`;
        }
        updatedLines.push(newLine);
      }
    }

    const newContent = [...updatedLines, ...lines].join("\n");
    await fs.writeFile(outPath, newContent, "utf-8");
  } else {
    const processedData = {};
    for (const key in data) {
      if (shouldQuote(key)) {
        processedData[key] = `'${data[key]}'`;
      } else {
        processedData[key] = data[key];
      }
    }
    const newContent = yaml.stringify(processedData);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, newContent, "utf-8");
  }
};

const fetchWithRetry = async (url) => {
  while (true) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (err) {}
    await delay(RETRY_DELAY);
  }
};

// === ОСНОВНАЯ ФУНКЦИЯ ===
const GET_data_using_REST = async () => {
  const settings = await loadSettings();
  const baseUrl = settings.BASE_URL;
  const endpoint = getEndpoint(baseUrl);
  const folder = getFolderType(baseUrl);
  const symbols = Array.isArray(settings.SYMBOLS)
    ? settings.SYMBOLS
    : [settings.SYMBOLS];
  const timeframes = Array.isArray(settings.TIMEFRAMES)
    ? settings.TIMEFRAMES
    : [settings.TIMEFRAMES];
  const accounts = Array.isArray(settings.BINANCE_ACCOUNT)
    ? settings.BINANCE_ACCOUNT
    : [settings.BINANCE_ACCOUNT];

  const tasks = [];

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const interval =
      i < timeframes.length ? timeframes[i] : timeframes[timeframes.length - 1];

    for (const symbol of symbols) {
      const stream = `${symbol.toLowerCase()}@kline_${interval}`;
      const task = (async () => {
        const storage = {};

        if (AGGREGATED_TIMEFRAMES.has(interval)) {
          const now = new Date();
          const start = getPeriodStart(interval, now);
          const params = new URLSearchParams({
            symbol: symbol.toUpperCase(),
            interval: "1M",
            startTime: start.getTime().toString(),
            endTime: now.getTime().toString(),
          });
          const url = `${baseUrl}${endpoint}?${params.toString()}`;
          const candles = await fetchWithRetry(url);
          const agg = aggregateMonthlyCandles(candles, start, now);
          Object.assign(storage, processCandleData(stream, agg));
        } else {
          const params = new URLSearchParams({
            symbol: symbol.toUpperCase(),
            interval,
            limit: settings.AMMOUNT_OF_GET_CANDLES.toString(),
          });
          const url = `${baseUrl}${endpoint}?${params.toString()}`;
          const candles = await fetchWithRetry(url);
          const count = candles.length;
          candles.forEach((candle, idx) => {
            const suffix = idx === count - 1 ? "" : `_${count - idx}`;
            const kline = {
              t: candle[0],
              o: candle[1],
              h: candle[2],
              l: candle[3],
              c: candle[4],
              v: candle[5],
              T: candle[6],
            };
            Object.assign(storage, processCandleData(stream, kline, suffix));
          });
        }

        await saveToFile(storage, account, folder, symbol, interval);
      })();

      tasks.push(task);
    }
  }

  await Promise.all(tasks);
};

export { GET_data_using_REST };
