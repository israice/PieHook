import fs from "fs/promises";
import yaml from "yaml";
import { reset_settings_QUANTITY_LONG_BUY_STEP } from "../../tools/reset_settings_QUANTITY_LONG_BUY_STEP.js";
import { add_plus_PERCENT_GREEN_STEP_ONCE } from "../../tools/add_plus_PERCENT_GREEN_STEP_ONCE.js";
import { add_plus_QUANTITY_SHORT_BUY_STEP } from "../../tools/add_plus_QUANTITY_SHORT_BUY_STEP.js";
import { update_body_using_QUANTITY_SELL_ALL } from "../../tools/update_body_using_QUANTITY_SELL_ALL.js";
import { sell_short_market_body } from "../Binance/GET_orders/sell_short_market_body.js";
import { update_body_using_QUANTITY_SHORT_BUY_STEP } from "../../tools/update_body_using_QUANTITY_SHORT_BUY_STEP.js";
import { buy_short_market_body } from "../Binance/GET_orders/buy_short_market_body.js";

async function long_List() {
  await add_plus_PERCENT_GREEN_STEP_ONCE();
  await reset_settings_QUANTITY_LONG_BUY_STEP();
  await add_plus_QUANTITY_SHORT_BUY_STEP();
  console.log("- - - ✅ buy_short_market_body");
}

async function check_closed_SHORT_GREEN_3() {
  try {
    const content1 = await fs.readFile("core/the_candle/candle.yaml", "utf8");
    const content2 = await fs.readFile(
      "core/the_candle/old_candle.yaml",
      "utf8"
    );

    const data1 = yaml.parse(content1);
    const data2 = yaml.parse(content2);

    const key1 = Object.keys(data1).find((k) => k.endsWith("_open"));
    const key2 = Object.keys(data2).find((k) => k.endsWith("_open"));

    if (!key1 || !key2) {
      console.error(
        "❌ Не найден ключ с окончанием '_open' в одном из файлов."
      );
      return;
    }

    const val1 = parseFloat(data1[key1]);
    const val2 = parseFloat(data2[key2]);

    if (isNaN(val1) || isNaN(val2)) {
      return;
    }

    if (val1 > val2) {
      await long_List();
    }
    // если меньше или равно — ничего не делаем
  } catch (err) {}
}

export { check_closed_SHORT_GREEN_3 };
