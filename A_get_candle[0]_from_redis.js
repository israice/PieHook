import fs from 'fs';
import yaml from 'js-yaml';
import * as redis from 'redis';

/* ===========================
   🔧 ДЕКЛАРАТИВНЫЕ НАСТРОЙКИ
   =========================== */

const SETTINGS_FILE = '1-Redis/settings.yaml';

const settings = yaml.load(fs.readFileSync(SETTINGS_FILE, 'utf8'));

const REDIS_HOST = settings.redis_host || 'localhost';
const REDIS_PORT = settings.redis_port || 6379;
const REDIS_DB   = settings.redis_db   || 0;
const REDIS_KEY  = settings.redis_key  || 'candle_key';

const OUTPUT_CSV = '4-Data/A_1m_candle[0].csv';

const CSV_HEADERS = [
  'Open_time',
  'Open_price',
  'High_price',
  'Low_price',
  'Close_price',
  'Volume',
  'Close_time',
  'Quote_asset_volume',
  'Number_of_trades',
  'Taker_buy_base_volume',
  'Taker_buy_quote_volume',
  'Ignore'
].join(',');

/* ===========================
   🚀 ОСНОВНАЯ ФУНКЦИЯ
   =========================== */

async function get_candle_from_redis() {
  const redisClient = redis.createClient({
    socket: { host: REDIS_HOST, port: REDIS_PORT },
    database: REDIS_DB,
  });

  // Попытка подключения 1 раз
  try {
    await redisClient.connect();
  } catch (err) {
    console.log(`❌ Не удалось подключиться к Redis по ${REDIS_HOST}:${REDIS_PORT}`);
    return; // выход, если подключение не удалось
  }

  try {
    const jsonData = await redisClient.get(REDIS_KEY);

    if (!jsonData) {
      console.log(`⚠️  Данные не получены. Ключ "${REDIS_KEY}" отсутствует в Redis.`);
      await redisClient.quit();
      return;
    }

    let data;
    try {
      data = JSON.parse(jsonData);
    } catch {
      console.log(`⚠️  Ошибка парсинга JSON для ключа "${REDIS_KEY}".`);
      await redisClient.quit();
      return;
    }

    const kline = data.k;
    if (!kline) {
      console.log(`⚠️  В данных отсутствует объект "k".`);
      await redisClient.quit();
      return;
    }

    const openTimeISO  = new Date(kline.t).toISOString();
    const closeTimeISO = new Date(kline.T).toISOString();

    const csvRow = [
      openTimeISO,
      kline.o,
      kline.h,
      kline.l,
      kline.c,
      kline.v,
      closeTimeISO,
      kline.q,
      kline.n,
      kline.x,
      kline.V,
      kline.Q
    ].join(',');

    fs.writeFileSync(OUTPUT_CSV, `${CSV_HEADERS}\n${csvRow}`);

    console.log(`✅ Свеча успешно получена из Redis и сохранена.`);

    await redisClient.quit();
  } catch (error) {
    console.error('❌ Произошла ошибка при работе с Redis:', error.message);
    await redisClient.quit().catch(() => {});
  }
}

export { get_candle_from_redis };
