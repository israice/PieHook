import { promises as fs } from 'fs';
import { clone_config_file } from './core/tools/clone_config_file';
import { change_CONFIG_1 } from './core/tools/change_CONFIG_1';
import { clone_old_data } from './core/tools/clone_old_data';
import { clone_settings } from './clone_settings';

async function run_List() {
  await clone_config_file();
  await change_CONFIG_1(); 
  await clone_old_data(); 
  await clone_settings(); 
}

async function reconfig_all_if_needed() {
  try {
    // Читаем оба файла параллельно
    const [settings, settingsOld] = await Promise.all([
      fs.readFile("settings.yaml", "utf8"),
      fs.readFile("settings_old.yaml", "utf8")
    ]);

    // Сравниваем содержимое файлов
    if (settings !== settingsOld) {
      await run_List();
    } else {
    }
  } catch (error) {
    console.error("Ошибка при чтении файлов:", error);
  }
}

// Экспортируем функцию для использования в других модулях
export { reconfig_all_if_needed };
