import fs from "fs/promises";
import yaml from "yaml";
import { update_body_using_QUANTITY_SELL_ALL } from "../../tools/update_body_using_QUANTITY_SELL_ALL.js";
import { sell_short_market_body } from "../Binance/GET_orders/sell_short_market_body.js";
import { update_body_using_QUANTITY_SHORT_BUY_STEP } from "../../tools/update_body_using_QUANTITY_SHORT_BUY_STEP.js";
import { add_plus_PERCENT_SHORT_BUY } from "../../tools/add_plus_PERCENT_SHORT_BUY.js";
import { add_plus_QUANTITY_SHORT_BUY_STEP } from "../../tools/add_plus_QUANTITY_SHORT_BUY_STEP.js";
import { buy_short_market_body } from "../Binance/GET_orders/buy_short_market_body.js";

// === Конфигурация ===
const CANDLE_FILE = "./core/the_candle/candle.yaml";
const CONFIG_FILE = "./core/the_candle/config.yaml";
const CANDLE_SUFFIX = "_open_percent";
const CONFIG_KEY = "PERCENT_SHORT_BUY";
// === Конец конфигурации ===

async function run_List() {
  await add_plus_PERCENT_SHORT_BUY();

  await add_plus_QUANTITY_SHORT_BUY_STEP();
  await update_body_using_QUANTITY_SELL_ALL();
  await sell_short_market_body();
  await update_body_using_QUANTITY_SHORT_BUY_STEP();
  await buy_short_market_body();
  console.log("- - - ✅ buy_short_market_body");
}

async function percent_of_short_buy() {
  try {
    const [candleContent, configContent] = await Promise.all([
      fs.readFile(CANDLE_FILE, "utf8"),
      fs.readFile(CONFIG_FILE, "utf8"),
    ]);

    const candleData = yaml.parse(candleContent);
    const configData = yaml.parse(configContent);

    const openKey = Object.keys(candleData).find((k) =>
      k.endsWith(CANDLE_SUFFIX)
    );

    const candleValue = parseFloat(
      String(candleData[openKey]).replace("%", "")
    );
    const configValue = parseFloat(
      String(configData[CONFIG_KEY]).replace("%", "")
    );

    if (isNaN(candleValue) || isNaN(configValue)) {
      console.error("❌ Ошибка: одно из значений не является числом");
      return;
    }

    if (candleValue > configValue) {
      await run_List();
    }

    // Если значение candle больше или равно config — ничего не делаем
  } catch (err) {
    console.error(`❌ Ошибка при чтении файлов:\n${err.message}`);
  }
}

export { percent_of_short_buy };
