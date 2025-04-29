import fs from "fs/promises";
import yaml from "yaml";
import { add_plus_PERCENT_SHORT_SELL } from "../../tools/add_plus_PERCENT_SHORT_SELL.js";
import { update_body_using_QUANTITY_SETTINGS } from "../../tools/update_body_using_QUANTITY_SETTINGS.js";
import { sell_short_market_body } from "../Binance/GET_orders/sell_short_market_body.js";
import { reset_body_symbol_via_settings } from "../../tools/reset_body_symbol_via_settings.js";

// === Конфигурация ===
const CANDLE_FILE = "./core/the_candle/candle.yaml";
const CONFIG_FILE = "./core/the_candle/config.yaml";
const CANDLE_SUFFIX = "_open_percent";
const CONFIG_KEY = "PERCENT_SHORT_SELL";

async function run_List() {
  await reset_body_symbol_via_settings();
  await add_plus_PERCENT_SHORT_SELL();
  await update_body_using_QUANTITY_SETTINGS();
  // await sell_short_market_body();
  console.log("- - - SHORT SELL");
}

async function percent_of_short_sell() {
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

    if (candleValue < configValue) {
      await run_List();
    }

    // Если значение candle больше или равно config — ничего не делаем
  } catch (err) {
    console.error(`❌ Ошибка при чтении файлов:\n${err.message}`);
  }
}

export { percent_of_short_sell };
