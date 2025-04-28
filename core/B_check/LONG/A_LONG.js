import fs from "fs/promises";
import yaml from "yaml";
import path from "path";
import { LONG_GREEN_2 } from "./ACA_GREEN_2.js";
import { LONG_RED_2 } from "./ACB_RED_2.js";
import { LONG_GREEN_3 } from "./ADA_GREEN_3.js";
import { LONG_RED_3 } from "./ADB_RED_3.js";

// === Конфигурация ===
const SETTINGS_FILE = path.join(process.cwd(), "settings.yaml");
const LONG_VARIABLE = "LONG";
const TRIGGER_VALUE = 1;

// === Конец конфигурации ===

async function long_List() {
  await LONG_GREEN_2();
  await LONG_RED_2();
  await LONG_GREEN_3();
  await LONG_RED_3();
}

async function LONG() {
  try {
    const content = await fs.readFile(SETTINGS_FILE, "utf8");
    const config = yaml.parse(content);

    if (!(LONG_VARIABLE in config)) {
      console.error(
        `❌ Ошибка: переменная ${LONG_VARIABLE} не найдена в ${SETTINGS_FILE}`
      );
      return;
    }

    if (config[LONG_VARIABLE] === TRIGGER_VALUE) {
      await long_List();
    }

    // если значение не соответствует TRIGGER_VALUE — ничего не делаем
  } catch (err) {
    console.error(`❌ Ошибка при чтении ${SETTINGS_FILE}:`, err.message);
  }
}

export { LONG };
