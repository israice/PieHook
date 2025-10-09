// Импорт модулей
import fs from "fs/promises";
import path from "path";
import yaml from "yaml";

import { add_plus_1_to_GREEN_candle_status_and_1 } from "./tools/add_plus_1_to_GREEN_candle_status_and_1.js";
import { change_STATUS_GREEN_0 } from "./tools/change_STATUS_GREEN_0.js";
import { add_plus_1_to_RED_candle_status_and_1 } from "./tools/add_plus_1_to_RED_candle_status_and_1.js";
import { change_STATUS_RED_0 } from "./tools/change_STATUS_RED_0.js";
import { reset_settings_SELL_PERCENT_SETTINGS } from "./tools/reset_settings_SELL_PERCENT_SETTINGS.js";
import { reset_settings_BUY_PERCENT_SETTINGS } from "./tools/reset_settings_BUY_PERCENT_SETTINGS.js";
import { reset_body_symbol_via_settings } from "./tools/reset_body_symbol_via_settings.js";

async function long_List() {
  await add_plus_1_to_GREEN_candle_status_and_1();
  await change_STATUS_RED_0();
  await reset_settings_SELL_PERCENT_SETTINGS();
  await reset_settings_BUY_PERCENT_SETTINGS();
  await reset_body_symbol_via_settings();
}
async function short_List() {
  await add_plus_1_to_RED_candle_status_and_1();
  await change_STATUS_GREEN_0();
  await reset_settings_SELL_PERCENT_SETTINGS();
  await reset_settings_BUY_PERCENT_SETTINGS();
  await reset_body_symbol_via_settings();
}

async function check_closed_trend_count_status() {
  try {
    const file1 = path.join("core", "the_candle", "candle.yaml");
    const file2 = path.join("core", "the_candle", "old_candle.yaml");

    const [content1, content2] = await Promise.all([
      fs.readFile(file1, "utf8"),
      fs.readFile(file2, "utf8"),
    ]);

    const data1 = yaml.parse(content1);
    const data2 = yaml.parse(content2);

    // Ищем ключи, заканчивающиеся на _open
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
    } else if (val1 < val2) {
      await short_List();
    }
    // Если равны — ничего не делаем
  } catch (err) {
  }
}

// Экспорт функции
export { check_closed_trend_count_status };
