import fs from "fs";
import yaml from "js-yaml";
import { update_body_using_QUANTITY_SELL_ALL } from "../../tools/update_body_using_QUANTITY_SELL_ALL.js";
import { sell_long_market_body } from "../Binance/GET_orders/sell_long_market_body.js";
import { update_body_using_QUANTITY_LONG_BUY_STEP } from "../../tools/update_body_using_QUANTITY_LONG_BUY_STEP.js";
import { add_plus_PERCENT_LONG_BUY } from "../../tools/add_plus_PERCENT_LONG_BUY.js";
import { add_plus_QUANTITY_LONG_BUY_STEP } from "../../tools/add_plus_QUANTITY_LONG_BUY_STEP.js";
import { buy_long_market_body } from "../Binance/GET_orders/buy_long_market_body.js";
import { reset_body_symbol_via_settings } from "../../tools/reset_body_symbol_via_settings.js";

const PATH_CANDLE_FILE = "core/the_candle/candle.yaml";
const PATH_CONFIG_FILE = "core/the_candle/config.yaml";
const KEY_TO_FIND_SUFFIX = "_open_percent";
const KEY_CONFIG_COMPARE = "PERCENT_LONG_BUY";

async function run_List() {
  await reset_body_symbol_via_settings();
  await add_plus_PERCENT_LONG_BUY();

  await add_plus_QUANTITY_LONG_BUY_STEP();
  await update_body_using_QUANTITY_SELL_ALL();
  await sell_long_market_body();
  await update_body_using_QUANTITY_LONG_BUY_STEP();
  await buy_long_market_body();
  console.log("- - - 🟢 LONG BUY");
}

async function percent_of_long_buy() {
  try {
    // Читаем содержимое файлов .yaml
    const candleFile = fs.readFileSync(PATH_CANDLE_FILE, "utf8");
    const configFile = fs.readFileSync(PATH_CONFIG_FILE, "utf8");

    // Парсим YAML в объекты
    const candleData = yaml.load(candleFile);
    const configData = yaml.load(configFile);

    // Ищем в candleData ключ, который заканчивается на KEY_TO_FIND_SUFFIX
    const foundKey = Object.keys(candleData).find((key) =>
      key.endsWith(KEY_TO_FIND_SUFFIX)
    );

    // Если ключ не найден — выводим ошибку
    if (!foundKey) {
      console.error(
        `Ошибка: переменная, оканчивающаяся на "${KEY_TO_FIND_SUFFIX}", не найдена в файле ${PATH_CANDLE_FILE}`
      );
      return;
    }

    // Достаём числовое значение из candle.yaml (убираем символ '%')
    const candleValue = parseFloat(candleData[foundKey].replace("%", ""));

    // Достаём числовое значение KEY_CONFIG_COMPARE (тоже убираем '%')
    const configValue = parseFloat(
      configData[KEY_CONFIG_COMPARE].replace("%", "")
    );

    // Сравниваем
    if (candleValue < configValue) {
      // Если значение candle.yaml выше, запускаем нужные функции
      await run_List();
    }
    // Если меньше или равно, ничего не делаем
  } catch (error) {
    console.error("Ошибка при чтении или парсинге файлов:", error);
  }
}

export { percent_of_long_buy };
