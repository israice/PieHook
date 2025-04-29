import fs from "fs/promises";
import yaml from "yaml";
import { GET_both_side_positions } from "../Binance/GET_data/GET_both_side_positions.js";
import { update_body_quantity_via_info_long_half_position } from "../../tools/update_body_quantity_via_info_long_half_position.js";
import { sell_long_market_body } from "../Binance/GET_orders/sell_long_market_body.js";
import { reset_body_symbol_via_settings } from "../../tools/reset_body_symbol_via_settings.js";
import { reset_settings_SELL_PERCENT_SETTINGS } from "../../tools/reset_settings_SELL_PERCENT_SETTINGS.js";
import { reset_settings_BUY_PERCENT_SETTINGS } from "../../tools/reset_settings_BUY_PERCENT_SETTINGS.js";
import { copy_first_candle_to_second_candle } from "../../copy_first_candle_to_second_candle.js";

async function long_List() {
  await reset_body_symbol_via_settings();
  await reset_settings_SELL_PERCENT_SETTINGS();
  await reset_settings_BUY_PERCENT_SETTINGS();
  await copy_first_candle_to_second_candle();

  // await GET_both_side_positions();
  await update_body_quantity_via_info_long_half_position();
  // await sell_long_market_body();
  console.log("- - - LONG SELL 50%");
  // -------------------------------
}

async function check_closed_LONG_GREEN_2() {
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

export { check_closed_LONG_GREEN_2 };
