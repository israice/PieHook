import fs from 'fs/promises';
import path from 'path';

const CONFIG_FILE = path.join('core', 'the_candle', 'config.yaml');
const TARGET_KEY = 'STATUS_OF_RED_CANDLE';
const NEW_VALUE = 0;

async function modifyConfigValue(filePath, key, newValue) {
  try {
    const content = await fs.readFile(filePath, 'utf8');

    let matchFound = false;
    let originalValue = null;

    const updated = content.replace(
      new RegExp(`^(\\s*${key}\\s*:\\s*)(\\d+)(\\s*.*)?$`, 'm'),
      (_, prefix, value, suffix = '') => {
        matchFound = true;
        originalValue = parseInt(value);
        return `${prefix}${newValue}${suffix}`;
      }
    );

    if (!matchFound || originalValue === newValue) return true;

    await fs.writeFile(filePath, updated, 'utf8');
    return true;
  } catch {
    return false;
  }
}

async function change_STATUS_RED_0() {
  await modifyConfigValue(CONFIG_FILE, TARGET_KEY, NEW_VALUE);
}

export { change_STATUS_RED_0 };
