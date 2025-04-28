// ============================================================
// УНИВЕРСАЛЬНЫЙ СКРИПТ ДЛЯ ОТПРАВКИ МАРКЕТ-ОРДЕРА buy_long_market_body
// Расчёт quantity в USDT по _close с авто-precision без exchangeInfo
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
  ORDER_URL:       'https://fapi.binance.com/fapi/v1/order',
  DOTENV_FILE:     '.env',
  ORDERS_YAML_KEY: 'body_collection',
};

dotenv.config({ path: CONFIG.DOTENV_FILE });

function safeQuantityFormat(qty) {
  if (qty >= 1000) return Math.floor(qty).toFixed(0);
  if (qty >= 1)    return (Math.floor(qty * 10) / 10).toFixed(1);
  return (Math.floor(qty * 100) / 100).toFixed(2);
}

async function buy_long_market_body() {
  try {
    // 1. Загрузка ордера из YAML
    const ordersText = await fs.readFile(CONFIG.ORDERS_FILE, 'utf8');
    const ordersData = YAML.parse(ordersText);
    const baseOrder  = ordersData?.[CONFIG.ORDERS_YAML_KEY]?.buy_long_market_body;
    if (!baseOrder) throw new Error('buy_long_market_body not found');

    // 2. Определение аккаунта через counter
    const pathsText = await fs.readFile(CONFIG.PATHS_FILE, 'utf8');
    const { counter, the_paths } = YAML.parse(pathsText);
    if (!Array.isArray(the_paths) || counter < 1 || counter > the_paths.length) {
      throw new Error('Invalid counter/the_paths');
    }
    const parts   = the_paths[counter - 1].split('\\');
    const account = parts[1];
    if (!account) throw new Error('Account parse error');

    // 3. Ключи API
    const apiKey    = process.env[`${account}_API_KEY`];
    const apiSecret = process.env[`${account}_API_SECRET`];
    if (!apiKey || !apiSecret) throw new Error('API key/secret not set');

    // 4. Получение цены из _close
    const candleText = await fs.readFile(CONFIG.CANDLE_FILE, 'utf8');
    const candleData = YAML.parse(candleText);
    const closeKey   = Object.keys(candleData).find(k => k.endsWith('_close'));
    if (!closeKey) throw new Error('_close key not found');
    const price = parseFloat(candleData[closeKey]);
    if (isNaN(price)) throw new Error('Invalid _close price');

    // 5. Расчёт quantity в USDT
    const usdtAmt = parseFloat(baseOrder.quantity);
    const lev     = parseFloat(baseOrder.leverage);
    if (isNaN(usdtAmt) || usdtAmt <= 0) throw new Error('Invalid quantity (USDT)');
    if (isNaN(lev)     || lev <= 0)     throw new Error('Invalid leverage');
    const rawQty = (usdtAmt / price) * lev;

    // 6. Универсальное округление
    const quantityStr = safeQuantityFormat(rawQty);

    // 7. Подпись и отправка ордера
    const params = { ...baseOrder, quantity: quantityStr, timestamp: Date.now() };
    Object.keys(params).forEach(key => { params[key] = String(params[key]); });
    const qs = Object.keys(params).sort().map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');
    const sig = crypto.createHmac('sha256', apiSecret).update(qs).digest('hex');

    const res = await axios.post(
      `${CONFIG.ORDER_URL}?${qs}&signature=${sig}`,
      null,
      { headers: { 'X-MBX-APIKEY': apiKey } }
    );

  } catch (err) {
  }
}

export { buy_long_market_body };
