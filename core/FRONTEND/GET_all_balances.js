// GET_all_balances.js

// === НАСТРОЙКИ ===
const ENV_PATH          = '.env';
const SETTINGS_FILE     = 'settings.yaml';
const OUTPUT_FILE       = 'core/FRONTEND/GET_all_balances.json';
const API_BASE_URL      = 'https://fapi.binance.com';
const POSITION_ENDPOINT = '/fapi/v2/positionRisk';
const BALANCE_ENDPOINT  = '/fapi/v2/balance';
const RECV_WINDOW       = 5000;

// === ИМПОРТЫ ===
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// === __dirname и корень проекта ===
const __filename   = fileURLToPath(import.meta.url);
const __dirname    = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

// === Утилита для построения путей от корня проекта ===
function resolveFromRoot(relativePath) {
  return path.resolve(PROJECT_ROOT, relativePath);
}

// === ЗАГРУЗКА .env ===
dotenv.config({ path: resolveFromRoot(ENV_PATH) });

// === Функция для генерации подписи ===
function generateSignature(queryString, secret) {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

// === ЗАГРУЗКА настроек из settings.yaml ===
async function loadSettings() {
  const content = await fs.readFile(resolveFromRoot(SETTINGS_FILE), 'utf8');
  return yaml.load(content);
}

// === Запрос позиции для account_type и symbol ===
async function fetchPosition(account_type, symbol) {
  const apiKey    = process.env[`${account_type}_API_KEY`];
  const apiSecret = process.env[`${account_type}_API_SECRET`];
  if (!apiKey || !apiSecret) {
    throw new Error(`❌ Нет API_KEY или API_SECRET для ${account_type} в .env`);
  }

  const timestamp   = Date.now();
  const params      = { timestamp, recvWindow: RECV_WINDOW };
  const queryString = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  const signature   = generateSignature(queryString, apiSecret);
  const url         = `${API_BASE_URL}${POSITION_ENDPOINT}?${queryString}&signature=${signature}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'X-MBX-APIKEY': apiKey }
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`❌ Binance API ${res.status}: ${txt}`);
  }

  const allPositions    = await res.json();
  const symbolPositions = allPositions.filter(p => p.symbol === symbol);
  const hedgeMode       = symbolPositions.some(p => ['LONG', 'SHORT'].includes(p.positionSide));

  return {
    account_type,
    symbol,
    hedge_mode_enabled: hedgeMode,
    positions: symbolPositions
  };
}

// === Запрос баланса USDT для account_type ===
async function fetchBalance(account_type) {
  const apiKey    = process.env[`${account_type}_API_KEY`];
  const apiSecret = process.env[`${account_type}_API_SECRET`];
  if (!apiKey || !apiSecret) {
    throw new Error(`❌ Нет API_KEY или API_SECRET для ${account_type} в .env`);
  }

  const timestamp   = Date.now();
  const params      = { timestamp, recvWindow: RECV_WINDOW };
  const queryString = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  const signature   = generateSignature(queryString, apiSecret);
  const url         = `${API_BASE_URL}${BALANCE_ENDPOINT}?${queryString}&signature=${signature}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'X-MBX-APIKEY': apiKey }
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`❌ Binance API ${res.status}: ${txt}`);
  }

  const balances = await res.json();
  const usdtObj  = balances.find(a => a.asset === 'USDT');
  return usdtObj ? parseFloat(usdtObj.balance) : 0;
}

// === ОСНОВНАЯ ФУНКЦИЯ ===
async function GET_all_balances() {
  const settings = await loadSettings();
  const accounts = settings.BINANCE_ACCOUNT || [];
  const symbols  = settings.SYMBOLS       || [];

  // 1) Получаем балансы всех аккаунтов
  const balancesMap = {};
  await Promise.all(accounts.map(async account => {
    const bal = await fetchBalance(account);
    balancesMap[account] = bal;
  }));

  // 2) Получаем позиции для каждой пары account–symbol
  const tasks = accounts.flatMap(account =>
    symbols.map(symbol => fetchPosition(account, symbol))
  );
  const results = await Promise.all(tasks);

  // 3) Формируем окончательный массив с нужным порядком полей
  const enriched = results.map(r => ({
    account_type:      r.account_type,
    symbol:            r.symbol,
    hedge_mode_enabled:r.hedge_mode_enabled,
    currentBalance:    balancesMap[r.account_type],
    positions:         r.positions
  }));

  // 4) Пишем в OUTPUT_FILE
  const outPath = resolveFromRoot(OUTPUT_FILE);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(enriched, null, 2), 'utf8');
}

// === ЭКСПОРТ ===
export { GET_all_balances };
