import { promises as fs } from 'fs';

async function clone_settings() {
  try {
    // Читаем содержимое файла settings.yaml
    const content = await fs.readFile("./settings.yaml", "utf8");
    // Записываем прочитанное содержимое в settings_old.yaml
    await fs.writeFile("./settings_old.yaml", content, "utf8");
  } catch (error) {
    console.error("Ошибка при копировании содержимого:", error);
  }
}

// Экспортируем функцию для использования в других модулях
export { clone_settings };
