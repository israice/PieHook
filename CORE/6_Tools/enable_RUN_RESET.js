
import * as fs from 'fs';

// ------------------------------------------
const FILE_PATH = 'CORE/4_Data/D_check_data.yaml'; // Path to the YAML file
const KEY_TO_UPDATE = 'RUN_RESET'; // Key to update in YAML
const NEW_VALUE = 'ENABLE'; // New value for the key
// ------------------------------------------

// Function to read file content
function readFile(path) {
  return fs.readFileSync(path, 'utf8');
}

// Function to check if key already has the desired value
function needsUpdate(content, key, value) {
  const regex = new RegExp(`^\\s*${key}:\\s*(.*)$`, 'gm');
  const match = regex.exec(content);
  if (match) {
    const currentValue = match[1].trim();
    return currentValue !== value;
  }
  throw new Error(`Key "${key}" not found in file`);
}

// Function to update specific key in text content
function updateKeyInText(content, key, value) {
  const regex = new RegExp(`^(\\s*${key}:\\s*).*$`, 'gm');
  return content.replace(regex, `$1${value}`);
}

// Function to write updated content to file
function writeFile(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

// Main execution function
async function enable_RUN_RESET() {
  let content = readFile(FILE_PATH);
  if (needsUpdate(content, KEY_TO_UPDATE, NEW_VALUE)) {
    content = updateKeyInText(content, KEY_TO_UPDATE, NEW_VALUE);
    writeFile(FILE_PATH, content);
  }
}


// enable_RUN_RESET();
export { enable_RUN_RESET };