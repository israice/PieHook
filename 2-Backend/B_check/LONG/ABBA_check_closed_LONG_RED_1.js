import fs from 'fs/promises';
import yaml from 'yaml';

async function short_List() {
}

async function check_closed_LONG_RED_1() {
  try {
    const content1 = await fs.readFile('core/the_candle/candle.yaml', 'utf8');
    const content2 = await fs.readFile('core/the_candle/old_candle.yaml', 'utf8');

    const data1 = yaml.parse(content1);
    const data2 = yaml.parse(content2);

    const key1 = Object.keys(data1).find(k => k.endsWith('_open'));
    const key2 = Object.keys(data2).find(k => k.endsWith('_open'));

    if (!key1 || !key2) {
      console.error("❌ Не найден ключ с окончанием '_open' в одном из файлов.");
      return;
    }

    const val1 = parseFloat(data1[key1]);
    const val2 = parseFloat(data2[key2]);

    if (isNaN(val1) || isNaN(val2)) {
      return;
    }

    if (val1 < val2) {
      await short_List();
    }
    // если больше или равно — ничего не делаем

  } catch (err) {
  }
}

export { check_closed_LONG_RED_1 };
