import { readFile, writeFile } from 'fs/promises';
import YAML from 'yaml';

/* ============================
   Настраиваемые параметры
   ============================ */
const CONFIG = {
  // Путь к YAML-файлу с данными свечей
  candleFilePath: 'core/the_candle/candle.yaml',
  // Путь к файлу настроек (находится в корне проекта)
  settingsFilePath: 'settings.yaml',
  // Ключ в файле настроек, определяющий максимальное число свечей (максимальный индекс производного ключа)
  settingsKey: 'AMMOUNT_OF_GET_CANDLES',
  // Регулярное выражение для проверки, что ключ является производным (заканчивается на _цифра)
  derivedKeyRegex: /_[0-9]+$/
};

/**
 * Асинхронно обновляет YAML-файл с данными свечей.
 *
 * Алгоритм:
 * 1. Загружается файл настроек (settings.yaml), откуда извлекается значение AMMOUNT_OF_GET_CANDLES.
 *    Это число задаёт максимально допустимый индекс производных ключей.
 * 2. Загружается YAML-файл (candle.yaml) с данными свечей.
 * 3. Для каждого базового ключа (без суффикса _номер) определяется цепочка производных ключей от _2 до _[AMMOUNT_OF_GET_CANDLES]:
 *    - Если отсутствует ключ _2, он создаётся с текущим значением базового ключа.
 *    - Если в цепочке обнаружен пропуск (например, отсутствует _3), выполняется сдвиг: 
 *      каждый ключ от отсутствующего до _3 получает значение предыдущего, и после этого базовое значение записывается в _2.
 *    - Если цепочка заполнена, то происходит полный сдвиг: для i от max до 3 значение ключа i = ключ i-1, 
 *      а затем базовое значение копируется в _2.
 * 4. После обновления, если в объекте встречаются производные ключи с индексом больше AMMOUNT_OF_GET_CANDLES,
 *    они удаляются.
 *
 * @param {string} [candleFilePath=CONFIG.candleFilePath] - путь к YAML-файлу с данными свечей.
 * @param {string} [settingsFilePath=CONFIG.settingsFilePath] - путь к файлу настроек.
 *
 * @returns {Promise<void>} Promise, возвращаемый функцией.
 */
async function copy_first_candle_to_second_candle(
  candleFilePath = CONFIG.candleFilePath,
  settingsFilePath = CONFIG.settingsFilePath
) {
  try {
    // Загрузка и парсинг настроек
    const settingsContent = await readFile(settingsFilePath, 'utf8');
    const settings = YAML.parse(settingsContent);
    const maxCandles = parseInt(settings[CONFIG.settingsKey], 10);
    if (isNaN(maxCandles) || maxCandles < 2) {
      console.error(
        `Некорректное значение ${CONFIG.settingsKey} в ${settingsFilePath}. Оно должно быть числом ≥ 2.`
      );
      return;
    }

    // Загрузка и парсинг YAML-файла с данными свечей
    const fileContent = await readFile(candleFilePath, 'utf8');
    const data = YAML.parse(fileContent);

    // Обрабатываем каждый базовый ключ (т.е. ключ без суффикса _номер)
    Object.keys(data).forEach((baseKey) => {
      if (!CONFIG.derivedKeyRegex.test(baseKey)) {
        const baseValue = data[baseKey];

        // Определяем первый отсутствующий индекс в цепочке производных ключей (начиная с 2)
        let firstMissing = null;
        for (let i = 2; i <= maxCandles; i++) {
          const key_i = `${baseKey}_${i}`;
          if (!(key_i in data)) {
            firstMissing = i;
            break;
          }
        }
        // Если все ключи от _2 до _maxCandles существуют, firstMissing считается maxCandles+1
        if (firstMissing === null) {
          firstMissing = maxCandles + 1;
        }

        if (firstMissing === 2) {
          // Если цепочка ещё не заведена, создаём key_2 с базовым значением
          data[`${baseKey}_2`] = baseValue;
        } else if (firstMissing <= maxCandles) {
          // Если обнаружен пропуск в цепочке, начиная с этого номера до _3 выполняется сдвиг
          for (let i = firstMissing; i >= 3; i--) {
            data[`${baseKey}_${i}`] = data[`${baseKey}_${i - 1}`];
          }
          // После сдвига базовое значение копируется в _2
          data[`${baseKey}_2`] = baseValue;
        } else {
          // Если цепочка полностью заполнена, выполняется полный сдвиг
          for (let i = maxCandles; i >= 3; i--) {
            data[`${baseKey}_${i}`] = data[`${baseKey}_${i - 1}`];
          }
          data[`${baseKey}_2`] = baseValue;
        }
      }
    });

    // Удаляем из объекта все производные ключи с индексами больше maxCandles
    Object.keys(data).forEach((key) => {
      const match = key.match(/_(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxCandles) {
          delete data[key];
        }
      }
    });

    // Сериализуем обновлённый объект обратно в YAML и записываем его в файл
    const newYamlContent = YAML.stringify(data);
    await writeFile(candleFilePath, newYamlContent, 'utf8');
  } catch (error) {
    console.error('Ошибка при обработке файлов:', error);
  }
}

export { copy_first_candle_to_second_candle };
