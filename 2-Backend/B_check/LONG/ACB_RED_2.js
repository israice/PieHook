import fs from "fs/promises";
import yaml from "yaml";
import { check_closed_LONG_RED_2 } from "./ACBA_check_closed_LONG_RED_2.js";
import { percent_of_long_buy } from "./percent_of_long_buy.js";

// === Конфигурация ===
const SETTINGS_FILE = "./core/the_candle/config.yaml";
const SHORT_VARIABLE = "STATUS_OF_RED_CANDLE";
const TRIGGER_VALUE = 2;

// === Конец конфигурации ===

async function short_List() {
  await check_closed_LONG_RED_2();
  await percent_of_long_buy();
}

async function LONG_RED_2() {
  try {
    const content = await fs.readFile(SETTINGS_FILE, "utf8");
    const config = yaml.parse(content);

    if (!(SHORT_VARIABLE in config)) {
      console.error(
        `❌ Ошибка: переменная ${SHORT_VARIABLE} не найдена в ${SETTINGS_FILE}`
      );
      return;
    }

    if (config[SHORT_VARIABLE] === TRIGGER_VALUE) {
      await short_List();
    }

    // если значение не соответствует TRIGGER_VALUE — ничего не делаем
  } catch (err) {
    console.error(`❌ Ошибка при чтении ${SETTINGS_FILE}:`, err.message);
  }
}

export { LONG_RED_2 };
