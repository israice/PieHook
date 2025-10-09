import { readFile, writeFile } from 'fs/promises';
import YAML from 'yaml';

/* ============================
   Настраиваемые параметры
   ============================ */
const CONFIG = {
  // Куда записывать обновлённые данные свечей
  candleFilePath: 'core/the_candle/candle.yaml',
  // Откуда брать предыдущие данные свечей
  oldCandleFilePath: 'core/the_candle/old_candle.yaml',
  // Путь к файлу настроек
  settingsFilePath: 'settings.yaml',
  // Ключ в файле настроек для числа свечей
  settingsKey: 'AMMOUNT_OF_GET_CANDLES',
  // Регэксп для производных ключей (_2, _3 и т.д.)
  derivedKeyRegex: /_[0-9]+$/
};

async function copy_first_candle_to_second_candle(
  candleFilePath = CONFIG.candleFilePath,
  settingsFilePath = CONFIG.settingsFilePath,
  oldCandleFilePath = CONFIG.oldCandleFilePath
) {
  try {
    // 1) читаем настройки
    const settingsContent = await readFile(settingsFilePath, 'utf8');
    const settings = YAML.parse(settingsContent);
    const maxCandles = parseInt(settings[CONFIG.settingsKey], 10);
    if (isNaN(maxCandles) || maxCandles < 2) {
      console.error(
        `Некорректное значение ${CONFIG.settingsKey} в ${settingsFilePath}. Должно быть число ≥ 2.`
      );
      return;
    }

    // 2) читаем данные из old_candle.yaml и текущие данные из candle.yaml
    const [oldContent, currentContent] = await Promise.all([
      readFile(oldCandleFilePath, 'utf8'),
      readFile(candleFilePath, 'utf8')
    ]);
    const oldData = YAML.parse(oldContent);
    const data    = YAML.parse(currentContent);

    // 3) для каждого базового ключа из oldData сдвигаем в data
    Object.keys(oldData).forEach((baseKey) => {
      if (CONFIG.derivedKeyRegex.test(baseKey)) return;
      const baseValue = oldData[baseKey];

      // ищем первый пропуск в цепочке _2…_maxCandles
      let firstMissing = null;
      for (let i = 2; i <= maxCandles; i++) {
        if (!( `${baseKey}_${i}` in data )) {
          firstMissing = i;
          break;
        }
      }
      if (firstMissing === null) firstMissing = maxCandles + 1;

      // сдвиг и вставка: всегда пишем только в производные ключи
      if (firstMissing === 2) {
        data[`${baseKey}_2`] = baseValue;
      } else if (firstMissing <= maxCandles) {
        for (let i = firstMissing; i >= 3; i--) {
          data[`${baseKey}_${i}`] = data[`${baseKey}_${i - 1}`];
        }
        data[`${baseKey}_2`] = baseValue;
      } else {
        for (let i = maxCandles; i >= 3; i--) {
          data[`${baseKey}_${i}`] = data[`${baseKey}_${i - 1}`];
        }
        data[`${baseKey}_2`] = baseValue;
      }
    });

    // 4) удаляем ключи с индексом > maxCandles
    Object.keys(data).forEach((key) => {
      const m = key.match(/_(\d+)$/);
      if (m && parseInt(m[1], 10) > maxCandles) {
        delete data[key];
      }
    });

    // 5) сериализуем и записываем обратно в candle.yaml
    const newYamlContent = YAML.stringify(data);
    await writeFile(candleFilePath, newYamlContent, 'utf8');
  } catch (error) {
    console.error('Ошибка при обработке файлов:', error);
  }
}

export { copy_first_candle_to_second_candle };
