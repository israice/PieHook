import fs from 'fs';
import yaml from 'js-yaml';
import * as redis from 'redis';

/* ===========================
   🔧 ДЕКЛАРАТИВНЫЕ НАСТРОЙКИ
   =========================== */

const SETTINGS_FILE = './settings.yaml';

const settings = yaml.load(fs.readFileSync(SETTINGS_FILE, 'utf8'));

const REDIS_HOST = settings.REDIS_HOST || 'localhost';
const REDIS_PORT = settings.REDIS_PORT || 6379;
const REDIS_DB   = settings.REDIS_DB   || 0;
const SYMBOLS_LIST = settings.SYMBOLS_LIST || [];

const OUTPUT_CSV = 'CORE/4_Data/A_1m_candle[0].csv';

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
    return;
  }

  try {
    const csvRows = [];

    // Читаем данные для всех символов
    for (let index = 0; index < SYMBOLS_LIST.length; index++) {
      const symbol = SYMBOLS_LIST[index];
      const redisKey = `new_1m_candle_${index}`;

      const jsonData = await redisClient.get(redisKey);

      if (!jsonData) {
        console.log(`⚠️  [${symbol}] Ключ "${redisKey}" отсутствует в Redis.`);
        continue;
      }

      let data;
      try {
        data = JSON.parse(jsonData);
      } catch {
        console.log(`⚠️  [${symbol}] Ошибка парсинга JSON для ключа "${redisKey}".`);
        continue;
      }

      const kline = data.k;
      if (!kline) {
        console.log(`⚠️  [${symbol}] В данных отсутствует объект "k".`);
        continue;
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

      csvRows.push(csvRow);
      console.log(`✓ [${symbol}] Свеча прочитана из Redis`);
    }

    if (csvRows.length === 0) {
      console.log(`⚠️  Нет данных для записи в CSV.`);
      await redisClient.quit();
      return;
    }

    // Запись всех строк разом (атомарно)
    const tempFile = `${OUTPUT_CSV}.tmp.${process.pid}.${Date.now()}`;
    const content = `${CSV_HEADERS}\n${csvRows.join('\n')}`;

    try {
      fs.writeFileSync(tempFile, content, { mode: 0o644 });
      fs.renameSync(tempFile, OUTPUT_CSV);
      console.log(`\n✅ Записано ${csvRows.length} свечей в ${OUTPUT_CSV}`);
    } catch (err) {
      try {
        fs.unlinkSync(tempFile);
      } catch {}
      throw err;
    }

    await redisClient.quit();
  } catch (error) {
    console.error('❌ Произошла ошибка при работе с Redis:', error.message);
    await redisClient.quit().catch(() => {});
  }
}

export { get_candle_from_redis };
