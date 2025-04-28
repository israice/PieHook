// GET_both_side_positions.js

// === НАСТРОЙКИ ===
const ENV_PATH = '.env';
const PATHS_FILE = 'core/B_check/the_paths.yaml';
const OUTPUT_FILE = 'core/B_check/Binance/GET_data/GET_both_side_positions.yaml';
const API_BASE_URL = 'https://fapi.binance.com';
const ENDPOINT = '/fapi/v2/positionRisk';
const RECV_WINDOW = 5000;
const PATH_SEPARATOR = '\\';
const BINANCE_DIR = 'Binance';
const PERPETUAL_DIR = 'perpetual';

// === ИМПОРТЫ ===
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// === __dirname и корень проекта ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../..');

// === Утилита для построения путей от корня проекта ===
function resolveFromRoot(relativePath) {
  return path.resolve(PROJECT_ROOT, relativePath);
}

// === ЗАГРУЗКА .env ===
dotenv.config({ path: resolveFromRoot(ENV_PATH) });

// === ПОДПИСЬ ===
function generateSignature(queryString, secret) {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

// === ЗАГРУЗКА YAML-КОНФИГА ===
async function loadConfig() {
  const content = await fs.readFile(resolveFromRoot(PATHS_FILE), 'utf8');
  return yaml.load(content);
}

// === ИЗВЛЕЧЕНИЕ account_type и symbol ===
function getPathData(thePaths, counter) {
  const currentPath = thePaths[counter - 1];
  const pathParts = currentPath.split(PATH_SEPARATOR);

  const binanceIndex = pathParts.indexOf(BINANCE_DIR);
  const account_type = binanceIndex !== -1 && binanceIndex + 1 < pathParts.length
    ? pathParts[binanceIndex + 1]
    : null;

  const perpetualIndex = pathParts.indexOf(PERPETUAL_DIR);
  const symbol = perpetualIndex !== -1 && perpetualIndex + 1 < pathParts.length
    ? pathParts[perpetualIndex + 1]
    : null;

  if (!account_type) throw new Error(`❌ Не найден account_type в пути: ${currentPath}`);
  if (!symbol) throw new Error(`❌ Не найден symbol в пути: ${currentPath}`);

  return { account_type, symbol };
}

// === ОСНОВНАЯ ФУНКЦИЯ ===
async function GET_both_side_positions() {
  const config = await loadConfig();
  const counter = config.counter ?? 1;
  const thePaths = config.the_paths ?? config.paths ?? [];

  const { account_type, symbol } = getPathData(thePaths, counter);

  const apiKey = process.env[`${account_type}_API_KEY`];
  const apiSecret = process.env[`${account_type}_API_SECRET`];

  if (!apiKey || !apiSecret) {
    throw new Error(`❌ Отсутствует API_KEY или API_SECRET для ${account_type} в .env`);
  }

  const timestamp = Date.now();
  const params = {
    timestamp,
    recvWindow: RECV_WINDOW
  };

  const queryString = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const signature = generateSignature(queryString, apiSecret);
  const fullUrl = `${API_BASE_URL}${ENDPOINT}?${queryString}&signature=${signature}`;

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: { 'X-MBX-APIKEY': apiKey }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`❌ Ошибка Binance API: ${response.status} - ${text}`);
  }

  const positions = await response.json();
  const symbolPositions = positions.filter(p => p.symbol === symbol);
  const hedgeModeEnabled = symbolPositions.some(p => ['LONG', 'SHORT'].includes(p.positionSide));

  const result = {
    hedge_mode_enabled: hedgeModeEnabled,
    positions: symbolPositions
  };

  await fs.mkdir(path.dirname(resolveFromRoot(OUTPUT_FILE)), { recursive: true });
  const yamlOutput = yaml.dump(result, { sortKeys: false });
  await fs.writeFile(resolveFromRoot(OUTPUT_FILE), yamlOutput, 'utf8');

}

// === ЭКСПОРТ ===
export { GET_both_side_positions };
