import fs from "fs/promises";
import path from "path";
import yaml from "yaml";

// === НАСТРОЙКИ ===
const PATHS_FILE = path.join("core", "B_check", "the_paths.yaml");
const DEST_CANDLE     = path.join("core", "the_candle", "candle.yaml");
const DEST_CONFIG     = path.join("core", "the_candle", "config.yaml");
const DEST_OLD_CANDLE = path.join("core", "the_candle", "old_candle.yaml");

async function copyIfNotEmpty(source, destination) {
  try {
    const stat = await fs.stat(source);
    if (stat.size > 0) {
      await fs.copyFile(source, destination);
    } else {
    }
  } catch (err) {
  }
}

async function bring_candle() {
  try {
    const raw = await fs.readFile(PATHS_FILE, "utf8");
    const data = yaml.parse(raw);

    const counter = data.counter;
    const the_paths = data.the_paths;

    if (!Array.isArray(the_paths) || typeof counter !== "number" || counter <= 0 || counter > the_paths.length) {
      console.error("❌ Неверный counter или структура the_paths");
      return;
    }

    const partialPath = the_paths[counter - 1];
    const pathParts = partialPath.split(path.sep);
    const timeframe = pathParts.pop();
    const relativeDir = pathParts.join(path.sep);

    const basePath = path.join("core", "B_check", relativeDir);

    const SOURCE_CANDLE     = path.join(basePath, `candle_${timeframe}.yaml`);
    const SOURCE_CONFIG     = path.join(basePath, `config_${timeframe}.yaml`);
    const SOURCE_OLD_CANDLE = path.join(basePath, `old_candle_${timeframe}.yaml`);

    // Копируем только непустые файлы
    await Promise.all([
      copyIfNotEmpty(SOURCE_CANDLE, DEST_CANDLE),
      copyIfNotEmpty(SOURCE_CONFIG, DEST_CONFIG),
      copyIfNotEmpty(SOURCE_OLD_CANDLE, DEST_OLD_CANDLE),
    ]);

  } catch (err) {
    console.error("❌ Ошибка при выполнении bring_candle:", err);
  }
}

export { bring_candle };
