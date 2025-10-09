import { readFile, writeFile } from 'fs/promises';
import yaml from 'yaml';

// ============ НАСТРОЙКИ ============ //
const SOURCE_FILE = 'core/B_check/Binance/GET_data/GET_both_side_positions.yaml'; // Файл с позициями
const TARGET_FILE = 'orders_collection.yaml'; // Файл, где обновляем quantity

const WALLET_KEY = 'isolatedWallet'; // Ключ значения, которое делим
const POSITION_SIDE_KEY = 'positionSide'; // Ключ, по которому фильтруем позиции
const TARGET_POSITION_SIDE = 'SHORT'; // Только у этих позиций берём значение

const QUANTITY_KEY = 'quantity'; // Ключ, который надо заменить в orders_collection
const DECIMAL_PLACES = 2; // Кол-во знаков после запятой
// ========== КОНЕЦ НАСТРОЕК ========= //

async function update_body_quantity_via_info_short_half_position() {
  try {
    const sourceContent = await readFile(SOURCE_FILE, 'utf8');
    const sourceData = yaml.parse(sourceContent);

    const positions = Array.isArray(sourceData.positions) ? sourceData.positions : [];
    const total = positions.reduce((sum, pos) => {
      if (pos[POSITION_SIDE_KEY] !== TARGET_POSITION_SIDE) return sum;
      const val = parseFloat(pos[WALLET_KEY]);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    if (total === 0) return;

    const newQuantity = parseFloat((total / 2).toFixed(DECIMAL_PLACES));

    const targetRaw = await readFile(TARGET_FILE, 'utf8');
    const lines = targetRaw.split('\n');

    const updatedLines = lines.map(line => {
      if (line.trim().startsWith(`${QUANTITY_KEY}:`)) {
        const prefix = line.split(`${QUANTITY_KEY}:`)[0];
        return `${prefix}${QUANTITY_KEY}: ${newQuantity}`;
      }
      return line;
    });

    await writeFile(TARGET_FILE, updatedLines.join('\n'), 'utf8');
  } catch (err) {
    console.error('❌ Ошибка:', err);
  }
}

export { update_body_quantity_via_info_short_half_position };
