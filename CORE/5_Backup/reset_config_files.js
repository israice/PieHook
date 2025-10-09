// При изменении ключевых настроек 
// удаляет предыдущую сессию 
// и клонирует конфиг, старые данные и текущие настройки

import { promises as fs } from "fs";
import yaml from "js-yaml";
import { clone_config_file } from "./tools/clone_config_file.js";
// import { clone_old_data } from "./tools/clone_old_data.js";
import { clone_settings } from "./clone_settings.js";
import { delete_previus_session } from "./delete_previus_session.js";
import { clear_front_files } from "./tools/clear_front_files.js";

async function run_List() {
  await delete_previus_session();
  await clone_config_file();
  await clear_front_files();
  // await clone_old_data();
  await clone_settings();
}

async function reset_config_files() {
  try {
    // Читаем оба файла параллельно
    const [settingsData, settingsOldData] = await Promise.all([
      fs.readFile("settings.yaml", "utf8"),
      fs.readFile("settings_old.yaml", "utf8"),
    ]);

    // Парсим YAML файлы в объекты
    const settings = yaml.load(settingsData);
    const settingsOld = yaml.load(settingsOldData);

    // Список ключей для сравнения
    const keysToCompare = ["BINANCE_ACCOUNT", "SYMBOLS", "TIMEFRAMES"];
    let different = false;

    // Сравниваем значения нужных переменных
    for (const key of keysToCompare) {
      if (JSON.stringify(settings[key]) !== JSON.stringify(settingsOld[key])) {
        different = true;
        break;
      }
    }

    // Если значения отличаются, запускаем run_List
    if (different) {
      await run_List();
    }
  } catch (error) {
    console.error("Ошибка при чтении файлов:", error);
  }
}

// Экспортируем функцию для использования в других модулях
export { reset_config_files };
