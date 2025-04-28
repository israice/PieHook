import fs from "fs/promises";
import yaml from "yaml";
import { check_if_price_lower_then_second_low } from "../../tools/check_if_price_lower_then_second_low.js";

// === Конфигурация ===
const SETTINGS_FILE = "./core/the_candle/config.yaml";
const SHORT_VARIABLE = "STATUS_OF_RED_CANDLE";
const TRIGGER_VALUE = 3;

// === Конец конфигурации ===

async function short_List() {
  await check_if_price_lower_then_second_low();
}

async function LONG_RED_3() {
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

export { LONG_RED_3 };
