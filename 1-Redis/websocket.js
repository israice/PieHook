import fs from 'fs/promises';
import Redis from 'redis';
import WebSocket from 'ws';
import YAML from 'yaml';
import chokidar from 'chokidar';
import { fromEvent, merge, timer, Subject } from 'rxjs';
import { mergeMap, tap, takeUntil, retryWhen, delay } from 'rxjs/operators';

// --- Constants ---
const SETTINGS_FILE = '/app/1-Redis/settings.yaml';

// --- 1. loadSettings ---
async function loadSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf8');
    const settings = YAML.parse(data) || {};

    settings.redis_host = settings.redis_host || 'redis';
    settings.redis_port = settings.redis_port || 6379;
    settings.redis_db = settings.redis_db || 0;
    settings.reconnect_delay = settings.reconnect_delay || 3;
    settings.max_reconnect_delay = settings.max_reconnect_delay || 60;
    settings.reconnect_after_hours = settings.reconnect_after_hours || 23;

    const requiredKeys = ['websocket_url', 'redis_key'];
    const missing = requiredKeys.filter((key) => settings[key] === undefined || settings[key] === null);

    if (missing.length) throw new Error(`Missing required settings: ${missing.join(', ')}`);

    return settings;
  } catch (err) {
    console.error('Failed to load settings:', err.message);
    process.exit(1);
  }
}

// --- 2. createRedisClient ---
async function createRedisClient(settings) {
  const client = Redis.createClient({
    socket: {
      host: settings.redis_host,
      port: settings.redis_port,
      reconnectStrategy: (retries) => Math.min(retries * 100, settings.max_reconnect_delay * 1000),
    },
    database: settings.redis_db,
  });
  client.on('error', (err) => console.error('Redis error:', err));
  await client.connect();
  console.log(`Connected to Redis at ${settings.redis_host}:${settings.redis_port}`);
  return client;
}

// --- 3. monitorSettingsFile ---
function monitorSettingsFile(settings, reconnect$) {
  const watcher = chokidar.watch(SETTINGS_FILE, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 200, // Wait 200ms to ensure file write is complete
      pollInterval: 100,
    },
    usePolling: true, // Force polling for Docker compatibility
  });

  watcher.on('all', (event, path) => {
    console.log(`Chokidar event: ${event}, path: ${path}`);
  });

  watcher.on('change', async () => {
    try {
      console.log('Chokidar "change" event triggered.');
      const newSettings = await loadSettings();
      if (newSettings.websocket_url !== settings.websocket_url) {
        console.log(`WebSocket URL changed to ${newSettings.websocket_url}`);
        settings.websocket_url = newSettings.websocket_url;
        reconnect$.next(); // Trigger reconnection
      }
    } catch (err) {
      console.error('Error reloading settings:', err.message);
    }
  });

  watcher.on('error', (err) => {
    console.error('Chokidar error:', err.message);
  });
}

// --- 4. monitorConnectionTime ---
function monitorConnectionTime(settings, reconnect$) {
  const hours = settings.reconnect_after_hours;
  timer(hours * 3600 * 1000).subscribe(() => {
    console.log(`${hours}-hour connection limit reached. Reconnecting...`);
    reconnect$.next();
  });
}

// --- 5. handleMessages ---
async function handleMessages(msg, redisClient, redisKey) {
  try {
    const data = msg.data.toString();
    JSON.parse(data); // Validate JSON
    await redisClient.set(redisKey, data);
    console.log(`Stored in Redis key '${redisKey}': ${data.slice(0, 150)}...`);
  } catch (err) {
    console.error('Error processing message (not valid JSON or other error):', err.message);
  }
}

// --- 6. binanceWebSocketToRedis ---
async function binanceWebSocketToRedis(settings, redisClient) {
  const { reconnect_delay, max_reconnect_delay, redis_key } = settings;
  let reconnectDelay = reconnect_delay * 1000;
  const reconnect$ = new Subject();

  // Start monitoring file and periodic reconnection
  monitorSettingsFile(settings, reconnect$);
  monitorConnectionTime(settings, reconnect$);

  const connectWebSocket = () => {
    console.log(`Connecting to ${settings.websocket_url}...`);
    const ws = new WebSocket(settings.websocket_url);

    const open$ = fromEvent(ws, 'open').pipe(
      tap(() => {
        console.log(`Connected at ${new Date().toISOString()}`);
        reconnectDelay = reconnect_delay * 1000; // Reset delay on successful connection
      })
    );

    const message$ = fromEvent(ws, 'message').pipe(
      mergeMap((msg) => handleMessages(msg, redisClient, redis_key))
    );

    const close$ = fromEvent(ws, 'close').pipe(
      tap(([code, reason]) => {
        console.warn(`WebSocket closed (${code}): ${reason}. Reconnecting in ${reconnectDelay / 1000}s`);
      })
    );

    const error$ = fromEvent(ws, 'error').pipe(
      tap((err) => console.error('WebSocket error:', err.message))
    );

    // Create a stream that listens for reconnection triggers
    const reconnectStream$ = reconnect$.pipe(
      tap(() => {
        console.log('Reconnection triggered, closing current WebSocket...');
        ws.terminate(); // Explicitly terminate the current WebSocket
      })
    );

    // Merge all streams and handle reconnection
    merge(open$, message$, close$, error$, reconnectStream$)
      .pipe(
        takeUntil(reconnect$), // Stop the current stream when reconnect$ emits
        retryWhen((errors) =>
          errors.pipe(
            tap((err) => console.error('WebSocket stream error, retrying...', err.message)),
            delay(reconnectDelay),
            tap(() => {
              reconnectDelay = Math.min(reconnectDelay * 2, max_reconnect_delay * 1000);
            })
          )
        )
      )
      .subscribe({
        complete: () => {
          console.log('WebSocket stream completed, initiating reconnection...');
          ws.terminate(); // Ensure WebSocket is closed
          connectWebSocket(); // Start a new connection with the latest URL
        }
      });
  };

  connectWebSocket();
}

// --- Main ---
(async () => {
  const settings = await loadSettings();
  const redisClient = await createRedisClient(settings);

  console.log('Starting Binance WebSocket → Redis connector...');
  console.log(`WebSocket URL: ${settings.websocket_url}`);
  console.log(`Redis: ${settings.redis_host}:${settings.redis_port}/${settings.redis_db}`);
  console.log(`Redis Key: ${settings.redis_key}`);

  await binanceWebSocketToRedis(settings, redisClient);
})();