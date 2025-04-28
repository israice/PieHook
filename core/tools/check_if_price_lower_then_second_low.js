import fs from 'fs/promises';
import yaml from 'yaml';
import { change_STATUS_RED_2 } from './change_STATUS_RED_2.js';

// === CONFIGURATION ===
// Paths to YAML files
const CANDLE_FILE = 'core/the_candle/candle.yaml';
const OLD_CANDLE_FILE = 'core/the_candle/candle.yaml';
// Suffixes for keys
const CURRENT_LOW_SUFFIX = '_low';
const OLD_LOW_SUFFIX = '_low_2';
// Comparison operator: '>' to trigger when current low is greater than old low_2
const COMPARISON_OPERATOR = '<';

// Map of comparison functions
const comparisonFunctions = {
  '<': (a, b) => a < b,
  '>': (a, b) => a > b,
};

// === ADDITIONAL FUNCTIONS ===
// Shortcut list execution
async function the_List() {
  await change_STATUS_RED_2();
  console.log("- - - 🔵 LONG BUY on LOW");
}

// === MAIN FUNCTION ===
async function check_if_price_lower_then_second_low() {
  try {
    // Read and parse both YAML files in parallel
    const [candleRaw, oldCandleRaw] = await Promise.all([
      fs.readFile(CANDLE_FILE, 'utf8'),
      fs.readFile(OLD_CANDLE_FILE, 'utf8')
    ]);
    const candleData = yaml.parse(candleRaw);
    const oldCandleData = yaml.parse(oldCandleRaw);

    // Find the keys based on the configured suffixes
    const lowKey = Object.keys(candleData).find(key => key.endsWith(CURRENT_LOW_SUFFIX));
    const low2Key = Object.keys(oldCandleData).find(key => key.endsWith(OLD_LOW_SUFFIX));

    if (!lowKey) {
      return;
    }
    if (!low2Key) {
      return;
    }

    // Parse the numeric values
    const lowValue = parseFloat(String(candleData[lowKey]));
    const low2Value = parseFloat(String(oldCandleData[low2Key]));

    // Retrieve comparison function
    const compare = comparisonFunctions[COMPARISON_OPERATOR];
    if (!compare) {
      console.error(`❌ Invalid comparison operator "${COMPARISON_OPERATOR}"`);
      return;
    }

    // Compare and execute list if condition is met
    if (compare(lowValue, low2Value)) {
      await the_List();
    }
  } catch (err) {
    console.error('Error comparing low values:', err);
  }
}

export { check_if_price_lower_then_second_low };
