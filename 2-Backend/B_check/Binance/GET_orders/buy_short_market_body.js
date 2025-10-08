// ============================================================
// НАСТРОЙКИ (CONFIGURATION)
// ============================================================
import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';

// Пути к файлам и URL Binance API
const CONFIG = {
  ORDERS_FILE: 'orders_collection.yaml',
  PATHS_FILE: path.join('core', 'B_check', 'the_paths.yaml'),
  CANDLE_FILE: path.join('core', 'the_candle', 'candle.yaml'),
  BINANCE_API_URL: 'https://fapi.binance.com/fapi/v1/order',
  DOTENV_FILE: '.env',
  ORDERS_YAML_KEY: 'body_collection',
  ORDERS_BODY_KEY: 'buy_short_market_body'
};

dotenv.config({ path: CONFIG.DOTENV_FILE });

// ============================================================
// ОСНОВНАЯ ФУНКЦИЯ — ОТПРАВКА МАРКЕТ-ОРДЕРА
// ============================================================
async function buy_short_market_body() {
  try {
    // === 1. Загрузка тела ордера из orders_collection.yaml ===
    const ordersText = await fs.readFile(CONFIG.ORDERS_FILE, 'utf8');
    const ordersData = YAML.parse(ordersText);
    const baseOrder = ordersData?.[CONFIG.ORDERS_YAML_KEY]?.[CONFIG.ORDERS_BODY_KEY];
    if (!baseOrder) {
      console.error('❌ Не найдено тело ордера в orders_collection.yaml');
      return;
    }

    // === 2. Получение пути из the_paths.yaml и извлечение имени аккаунта ===
    const pathsText = await fs.readFile(CONFIG.PATHS_FILE, 'utf8');
    const pathsData = YAML.parse(pathsText);
    const counter = pathsData?.counter;
    const thePaths = pathsData?.the_paths;
    if (!counter || !Array.isArray(thePaths) || thePaths.length < counter) {
      console.error('❌ Ошибка в файле the_paths.yaml');
      return;
    }
    const selectedPath = thePaths[counter - 1];
    const splitToken = 'Binance\\';
    if (!selectedPath.includes(splitToken)) {
      console.error(`❌ Не удалось извлечь имя аккаунта из пути: ${selectedPath}`);
      return;
    }
    const account = selectedPath.split(splitToken)[1].split('\\')[0];

    // === 3. Получение API-ключей из .env ===
    const apiKey = process.env[`${account}_API_KEY`];
    const apiSecret = process.env[`${account}_API_SECRET`];
    if (!apiKey || !apiSecret) {
      console.error(`❌ API ключи для ${account} не найдены в .env`);
      return;
    }

    // === 4. Получение текущей цены из candle.yaml (переменная, заканчивающаяся на _close) ===
    const candleText = await fs.readFile(CONFIG.CANDLE_FILE, 'utf8');
    const candleData = YAML.parse(candleText);
    const closeKey = Object.keys(candleData).find(k => k.endsWith('_close'));
    if (!closeKey) {
      console.error('❌ Не найдена переменная *_close в candle.yaml');
      return;
    }
    const currentPrice = parseFloat(candleData[closeKey]);
    if (!currentPrice || isNaN(currentPrice)) {
      console.error(`❌ Некорректная цена по ключу ${closeKey}:`, candleData[closeKey]);
      return;
    }

    // === 5. Расчёт количества токена (quantity) ===
    // Исходное значение из orders_collection.yaml трактуется как сумма в USDT.
    // Первоначально вычисляем количество токенов по формуле: usdtAmount / currentPrice,
    // а затем умножаем на leverage.
    const usdtAmount = parseFloat(baseOrder.quantity);
    if (isNaN(usdtAmount) || usdtAmount <= 0) {
      console.error('❌ Неверное значение quantity для расчёта (ожидается число > 0).');
      return;
    }
    const leverage = parseFloat(baseOrder.leverage);
    if (isNaN(leverage) || leverage <= 0) {
      console.error('❌ Неверное значение leverage для расчёта (ожидается число > 0).');
      return;
    }
    const rawQuantity = (usdtAmount / currentPrice) * leverage;
    // Допустимая точность определяется по количеству знаков после запятой в исходном значении quantity.
    const usdtStr = baseOrder.quantity.toString();
    const allowedPrecision = usdtStr.includes('.') ? usdtStr.split('.')[1].length : 0;
    const calculatedQuantity = rawQuantity.toFixed(allowedPrecision);

    // === 6. Подготовка параметров запроса ===
    const baseParams = {
      ...baseOrder,
      quantity: calculatedQuantity, // подставляем вычисленное количество
      timestamp: Date.now()
    };

    // Приведение всех параметров к строке
    for (const key in baseParams) {
      baseParams[key] = baseParams[key].toString();
    }

    // Создание строки запроса с сортировкой ключей
    const queryString = Object.keys(baseParams)
      .sort()
      .map(key => `${key}=${encodeURIComponent(baseParams[key])}`)
      .join('&');

    // Вычисление подписи
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(queryString)
      .digest('hex');

    const fullQuery = `${queryString}&signature=${signature}`;

    // === 7. Отправка запроса на Binance API ===
    const response = await axios.post(
      `${CONFIG.BINANCE_API_URL}?${fullQuery}`,
      null,
      { headers: { 'X-MBX-APIKEY': apiKey } }
    );


  } catch {
  }
}

// === ЭКСПОРТ ФУНКЦИИ ===
export { buy_short_market_body };
