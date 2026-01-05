import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Путь к CSV файлу
const CSV_FILE = path.join(__dirname, '../4_Data/A_1m_candle[0].csv');

// Хранилище активных SSE подключений
const clients = new Set();

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

    const data = JSON.stringify({ headers, rows, timestamp: new Date().toISOString() });

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
// Express Routes
// ================================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Статические файлы (HTML, CSS, JS)
app.use(express.static(__dirname));

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

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log(`  SSE Server for CSV Real-Time Updates`);
  console.log('═══════════════════════════════════════');
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Monitoring: ${CSV_FILE}`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/events`);
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

  // Закрываем watcher
  await watcher.close();
  console.log('✓ File watcher closed');

  console.log('✓ Shutdown complete\n');
  process.exit(0);
});
