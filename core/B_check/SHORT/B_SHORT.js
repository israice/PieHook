import fs from "fs/promises";
import yaml from "yaml";
import path from "path";
import { SHORT_GREEN_2 } from "./BCA_GREEN_2.js";
import { SHORT_RED_2 } from "./BCB_RED_2.js";
import { SHORT_GREEN_3 } from "./BDA_GREEN_3.js";
import { SHORT_RED_3 } from "./BDB_RED_3.js";

// === Конфигурация ===
const SETTINGS_FILE = path.join(process.cwd(), "settings.yaml");
const SHORT_VARIABLE = "SHORT";
const TRIGGER_VALUE = 1;

// === Конец конфигурации ===

async function short_List() {
  await SHORT_GREEN_2();
  await SHORT_RED_2();
  await SHORT_GREEN_3();
  await SHORT_RED_3();
}

async function SHORT() {
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

export { SHORT };
