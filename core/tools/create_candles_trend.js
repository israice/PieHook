// 1. Подключает модули для работы с файлами и YAML
// 2. Читает настройки из settings.yaml
// 3. Проверяет, что в настройках есть списки symbols, timeframes и BINANCE_ACCOUNT
// 4. Определяет тип папки (perpetual, testnet или spot) по BASE_URL
// 5. Для каждого аккаунта, таймфрейма и символа:
//    – формирует путь к candle_<timeframe>.yaml
//    – читает файл и ищет строки с ключами _open_percent
//    – определяет, положительное или отрицательное значение
//    – добавляет или обновляет ключ _trend со значением LONG или SHORT
//    – записывает изменения обратно в файл
// 6. При ошибках повторяет попытку чтения/записи с небольшой задержкой

// Импорт необходимых модулей с использованием ES-модулей
import { readFile, writeFile, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "yaml";

// =======================
// CONFIGURATION SETTINGS
// =======================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SETTINGS_PATH = path.resolve(__dirname, "../../settings.yaml");
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const OUTPUT_BASE_PATH = path.join(PROJECT_ROOT, "core", "B_check", "Binance");

const LONG_VALUE = "'LONG'";
const SHORT_VALUE = "'SHORT'";
const PERCENT_PATTERN = /-?\d+\.?\d*/;

const MAX_RETRIES = 1;
const INITIAL_DELAY = 100;

// =======================
// UTILITY FUNCTIONS
// =======================

async function loadSettings() {
  try {
    await access(SETTINGS_PATH);
  } catch {
    console.error(`Error: settings file ${SETTINGS_PATH} is missing.`);
    return null;
  }

  const content = await readFile(SETTINGS_PATH, "utf-8");
  return yaml.parse(content) || {};
}

function getFolderType(baseUrl) {
  if (baseUrl.includes("fapi")) return "perpetual";
  if (baseUrl.includes("testnet")) return "testnet";
  if (baseUrl.includes("api.binance.com")) return "spot";
  return "unknown";
}

function getCandleFilePath(account, folder, symbol, timeframe) {
  return path.join(
    OUTPUT_BASE_PATH,
    account,
    folder,
    symbol.toUpperCase(),
    `candle_${timeframe}.yaml`
  );
}

function processPercentValue(value) {
  try {
    const cleanValue = value.replace(/['"%]/g, "").trim();
    const match = cleanValue.match(PERCENT_PATTERN);
    if (match) {
      const number = parseFloat(match[0]);
      if (number === 0) return null;
      return number > 0;
    }
  } catch {
    return null;
  }
}

// - - - ✅ Обновлённая функция — удаляет пустые строки и корректно добавляет тренд
function updateOrAddTrendValue(lines, key, trendValue) {
  const trendKey = key.replace("_open_percent", "_trend");
  let updated = false;

  // Удаляем пустые строки в конце, если есть
  while (lines.length && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  const newLines = lines.map((line) => {
    if (line.trim().startsWith(`${trendKey}:`)) {
      updated = true;
      return `${trendKey}: ${trendValue}`;
    }
    return line;
  });

  if (!updated) {
    newLines.push(`${trendKey}: ${trendValue}`);
  }

  return newLines;
}

// =======================
// MAIN PROCESSING FUNCTIONS
// =======================

async function processFile(filePath) {
  let retries = MAX_RETRIES;
  const pattern = /^(.*_open_percent(?:_\d+)?):\s*(.*)$/;

  while (retries > 0) {
    try {
      await access(filePath);

      const fileContent = await readFile(filePath, "utf-8");
      let lines = fileContent.split("\n");
      if (!lines.length) {
        console.error(`Error: file ${filePath} is empty.`);
        return;
      }

      let modified = false;
      for (const line of lines) {
        const m = line.trim().match(pattern);
        if (m) {
          const key = m[1];
          const value = m[2];
          if (!value) {
            console.log(`Skipped line: ${line}. No value for comparison.`);
            continue;
          }

          const isPositive = processPercentValue(value);
          if (isPositive !== null) {
            const trendValue = isPositive ? LONG_VALUE : SHORT_VALUE;
            lines = updateOrAddTrendValue(lines, key, trendValue);
            modified = true;
          }
        }
      }

      if (modified) {
        await writeFile(filePath, lines.join("\n") + "\n", "utf-8");
      }
      break;
    } catch (e) {
      retries -= 1;
      if (retries === 0) {
        console.error(`Failed to process file ${filePath}:`, e);
      }
      await new Promise((res) => setTimeout(res, INITIAL_DELAY));
    }
  }
}

async function create_candles_trend() {
  const settings = await loadSettings();
  if (!settings) return;

  const lowerCaseSettings = Object.fromEntries(
    Object.entries(settings).map(([k, v]) => [k.toLowerCase(), v])
  );

  if (
    !Array.isArray(lowerCaseSettings.symbols) ||
    !lowerCaseSettings.symbols.length
  ) {
    console.error(
      "Error: 'symbols' in settings.yaml is missing or not a list."
    );
    return;
  }

  if (!lowerCaseSettings.timeframes || !lowerCaseSettings.timeframes.length) {
    console.error("Error: 'timeframes' key is missing in settings.yaml.");
    return;
  }

  const symbols = lowerCaseSettings.symbols.map((s) => s.toLowerCase());
  const timeframes = lowerCaseSettings.timeframes;

  const accounts = settings.BINANCE_ACCOUNT;
  if (!Array.isArray(accounts) || accounts.length === 0) {
    console.error(
      "Error: BINANCE_ACCOUNT is missing or not a list in settings.yaml."
    );
    return;
  }

  const baseUrl = settings.BASE_URL || "";
  const folderType = getFolderType(baseUrl);

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const tf =
      i < timeframes.length ? timeframes[i] : timeframes[timeframes.length - 1];

    for (const symbol of symbols) {
      const filePath = getCandleFilePath(account, folderType, symbol, tf);
      await processFile(filePath);
    }
  }
}

export { create_candles_trend };
