// ============================================================
// УНИВЕРСАЛЬНЫЙ СКРИПТ ДЛЯ ОТПРАВКИ МАРКЕТ-ОРДЕРА buy_long_market_body
// quantity в YAML = сумма в USDT, точный расчёт по stepSize и _close
// ============================================================

import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';

const CONFIG = {
  ORDERS_FILE:     'orders_collection.yaml',
  PATHS_FILE:      path.join('core', 'B_check', 'the_paths.yaml'),
  CANDLE_FILE:     path.join('core', 'the_candle', 'candle.yaml'),
  EXCHANGE_INFO_FILE: path.join('core', 'B_check', 'Binance', 'GET_data', 'steps.json'),
  ORDER_URL:       'https://fapi.binance.com/fapi/v1/order',
  DOTENV_FILE:     '.env',
  ORDERS_YAML_KEY: 'body_collection',
};

dotenv.config({ path: CONFIG.DOTENV_FILE });

// === Округление вниз до кратного stepSize
function floorToStepSize(qty, stepSize) {
  const factor = 1 / stepSize;
  return (Math.floor(qty * factor) / factor).toFixed(getPrecision(stepSize));
}

function getPrecision(stepSize) {
  return Math.max(0, Math.round(-Math.log10(stepSize)));
}

// === Расчёт максимально допустимого quantity по цене и stepSize
function getMaxAllowedQuantity(price, usdt, leverage, stepSize) {
  const maxQty = (usdt * leverage) / price;
  return floorToStepSize(maxQty, stepSize);
}

// === Получение stepSize из локального steps.json
async function getStepSizeForSymbol(symbol) {
  const raw = await fs.readFile(CONFIG.EXCHANGE_INFO_FILE, 'utf8');
  const info = JSON.parse(raw);
  const entry = info.symbols.find(s => s.symbol === symbol);
  if (!entry) throw new Error(`Symbol ${symbol} not found in ${CONFIG.EXCHANGE_INFO_FILE}`);
  const lotFilter = entry.filters.find(f => f.filterType === 'LOT_SIZE');
  if (!lotFilter) throw new Error(`LOT_SIZE filter not found for ${symbol}`);
  return parseFloat(lotFilter.stepSize);
}

// === Основная функция
async function buy_long_market_body() {
  try {
    // 1. Загрузка ордера
    const ordersText = await fs.readFile(CONFIG.ORDERS_FILE, 'utf8');
    const ordersData = YAML.parse(ordersText);
    const baseOrder  = ordersData?.[CONFIG.ORDERS_YAML_KEY]?.buy_long_market_body;
    if (!baseOrder) throw new Error('❌ buy_long_market_body not found');

    // 2. Аккаунт из the_paths.yaml
    const pathsText = await fs.readFile(CONFIG.PATHS_FILE, 'utf8');
    const { counter, the_paths } = YAML.parse(pathsText);
    if (!Array.isArray(the_paths) || counter < 1 || counter > the_paths.length) {
      throw new Error('❌ Invalid counter/the_paths');
    }
    const currentPath = the_paths[counter - 1];
    const parts = currentPath.split(/[\\/]/);
    const account = parts[1];
    if (!account) throw new Error('❌ Cannot determine account from path');

    // 3. API‑ключи
    const apiKey    = process.env[`${account}_API_KEY`];
    const apiSecret = process.env[`${account}_API_SECRET`];
    if (!apiKey || !apiSecret) throw new Error('❌ API key/secret not set');

    // 4. Получение цены из candle.yaml
    const candleText = await fs.readFile(CONFIG.CANDLE_FILE, 'utf8');
    const candleData = YAML.parse(candleText);
    const closeKey   = Object.keys(candleData).find(k => k.endsWith('_close'));
    if (!closeKey) throw new Error('❌ _close key not found');
    const price = parseFloat(candleData[closeKey]);
    if (isNaN(price)) throw new Error('❌ Invalid _close price');

    // 5. Расчёт quantity на основе quantity как USDT
    const usdtAmt = parseFloat(baseOrder.quantity);  // quantity = сумма в USDT
    const lev     = parseFloat(baseOrder.leverage);
    if (isNaN(usdtAmt) || usdtAmt <= 0) throw new Error('❌ Invalid USDT amount');
    if (isNaN(lev)     || lev <= 0)     throw new Error('❌ Invalid leverage');

    const symbol     = baseOrder.symbol;
    const stepSize   = await getStepSizeForSymbol(symbol);
    const quantityStr = getMaxAllowedQuantity(price, usdtAmt, lev, stepSize);

    // 6. Подготовка тела запроса
    const params = { ...baseOrder, quantity: quantityStr, timestamp: Date.now() };
    Object.keys(params).forEach(k => { params[k] = String(params[k]); });
    const qs  = Object.keys(params).sort().map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
    const sig = crypto.createHmac('sha256', apiSecret).update(qs).digest('hex');

    // 7. Отправка запроса
    const res = await axios.post(`${CONFIG.ORDER_URL}?${qs}&signature=${sig}`, null, {
      headers: { 'X-MBX-APIKEY': apiKey }
    });


  } catch (err) {
  }
}

export { buy_long_market_body };
