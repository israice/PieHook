import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Путь к CSV файлу
const CSV_FILE = path.join(__dirname, '../4_Data/A_1m_candle[0].csv');
const SETTINGS_FILE = path.join(__dirname, '../../settings.yaml');
const README_FILE = path.join(__dirname, '../../README.md');

// Хранилище активных SSE подключений
const clients = new Set();

// Кэш для символов
let symbolsList = [];

// ================================================
// Чтение версии из README.md
// ================================================

function getVersionFromReadme() {
  try {
    const readmeContent = fs.readFileSync(README_FILE, 'utf8');
    // Ищем строку вида: git commit -m "v0.0.13 - testing version change 2"
    const match = readmeContent.match(/git commit -m "v(\d+\.\d+\.\d+)[^"]*"/);
    if (match) {
      return `v${match[1]}`;
    }
    return 'v0.0.0';
  } catch (error) {
    console.error('Error reading version from README.md:', error.message);
    return 'v0.0.0';
  }
}

// ================================================
// Чтение символов из settings.yaml
// ================================================

function loadSymbols() {
  try {
    const fileContents = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const settings = yaml.load(fileContents);
    symbolsList = settings.SYMBOLS_LIST || [];
    console.log(`📋 Loaded ${symbolsList.length} symbol(s):`, symbolsList);
    return symbolsList;
  } catch (error) {
    console.error('Error loading symbols from settings.yaml:', error.message);
    symbolsList = [];
    return symbolsList;
  }
}

// ================================================
// SSE: Отправка данных всем подключенным клиентам
// ================================================

function broadcastCsvData() {
  try {
    const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
    const lines = csvContent.trim().split('\n');

    if (lines.length === 0) {
      return;
    }

    const headers = lines[0].split(',');
    const rows = lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      return obj;
    });

    const data = JSON.stringify({
      headers,
      rows,
      symbols: symbolsList,
      timestamp: new Date().toISOString()
    });

    // Отправляем всем подключенным клиентам
    clients.forEach(client => {
      client.write(`data: ${data}\n\n`);
    });

    console.log(`📡 Broadcasted to ${clients.size} client(s)`);
  } catch (error) {
    console.error('Error broadcasting CSV data:', error.message);
  }
}

// ================================================
// Мониторинг изменений файла
// ================================================

const watcher = chokidar.watch(CSV_FILE, {
  persistent: true,
  ignoreInitial: true,
  usePolling: true,        // Используем polling вместо native watching
  interval: 500,           // Проверяем каждые 500мс
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 50,
  },
});

watcher.on('ready', () => {
  console.log(`👁️  File watcher is ready, monitoring: ${CSV_FILE}`);
});

watcher.on('change', () => {
  console.log(`📝 CSV file changed: ${CSV_FILE}`);
  broadcastCsvData();
});

watcher.on('error', (error) => {
  console.error('File watcher error:', error);
});

// ================================================
// Мониторинг изменений settings.yaml
// ================================================

const settingsWatcher = chokidar.watch(SETTINGS_FILE, {
  persistent: true,
  ignoreInitial: false,
  usePolling: true,
  interval: 500,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 50,
  },
});

settingsWatcher.on('ready', () => {
  console.log(`👁️  Settings watcher is ready, monitoring: ${SETTINGS_FILE}`);
});

settingsWatcher.on('change', () => {
  console.log(`⚙️  Settings file changed: ${SETTINGS_FILE}`);
  loadSymbols();
  broadcastCsvData(); // Отправляем обновленные данные с новым списком символов
});

settingsWatcher.on('add', () => {
  console.log(`⚙️  Settings file added: ${SETTINGS_FILE}`);
  loadSymbols();
});

settingsWatcher.on('error', (error) => {
  console.error('Settings watcher error:', error);
});

// ================================================
// Express Routes
// ================================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Статические файлы (HTML, CSS, JS)
app.use(express.static(__dirname));

// Version API endpoint
app.get('/api/version', (req, res) => {
  try {
    const version = getVersionFromReadme();
    res.json({ version, commit: 'from README.md' });
  } catch (error) {
    console.error('Error getting version:', error);
    res.json({ version: 'v0.0.0', commit: 'unknown' });
  }
});

// Symbols API endpoint
app.get('/api/symbols', (req, res) => {
  try {
    res.json({ symbols: symbolsList });
  } catch (error) {
    console.error('Error getting symbols:', error);
    res.json({ symbols: [] });
  }
});

// SSE endpoint
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Добавляем клиента
  clients.add(res);
  console.log(`✅ New client connected (total: ${clients.size})`);

  // Отправляем текущие данные сразу при подключении
  broadcastCsvData();

  // Удаляем клиента при отключении
  req.on('close', () => {
    clients.delete(res);
    console.log(`❌ Client disconnected (total: ${clients.size})`);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    clients: clients.size,
    file: CSV_FILE,
    exists: fs.existsSync(CSV_FILE)
  });
});

// ================================================
// Запуск сервера
// ================================================

// Загружаем символы при старте
loadSymbols();

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log(`  SSE Server for CSV Real-Time Updates`);
  console.log('═══════════════════════════════════════');
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Monitoring: ${CSV_FILE}`);
  console.log(`⚙️  Monitoring: ${SETTINGS_FILE}`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/events`);
  console.log(`🔗 Symbols API: http://localhost:${PORT}/api/symbols`);
  console.log('═══════════════════════════════════════\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⏸  Shutting down...');

  // Закрываем все SSE соединения
  clients.forEach(client => {
    client.end();
  });
  clients.clear();

  // Закрываем watchers
  await watcher.close();
  console.log('✓ CSV watcher closed');

  await settingsWatcher.close();
  console.log('✓ Settings watcher closed');

  console.log('✓ Shutdown complete\n');
  process.exit(0);
});
