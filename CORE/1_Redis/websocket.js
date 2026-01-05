import fs from "fs/promises";
import Redis from "redis";
import WebSocket from "ws";
import YAML from "yaml";
import chokidar from "chokidar";
import { fromEvent, merge, Subject, defer, timer } from "rxjs";
import { mergeMap, tap, takeUntil, switchMap, catchError, finalize } from "rxjs/operators";

// --- Constants ---
const SETTINGS_FILE = "./settings.yaml";
const BINANCE_WS_BASE = "wss://fstream.binance.com/ws/";
const REDIS_HOST = "redis";
const REDIS_PORT = 6379;
const REDIS_DB = 0;
const RECONNECT_DELAY = 3;
const MAX_RECONNECT_DELAY = 60;
const RECONNECT_AFTER_HOURS = 23;
const HEALTH_CHECK_TIMEOUT = 5 * 60 * 1000; // 5 minutes without messages = dead connection

// --- 1. Load Settings ---
async function loadSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf8");
    const settings = YAML.parse(data) || {};

    if (!settings.SYMBOLS_LIST || !Array.isArray(settings.SYMBOLS_LIST) || settings.SYMBOLS_LIST.length === 0) {
      throw new Error("SYMBOLS_LIST must be a non-empty array in settings.yaml");
    }

    console.log(`✓ Settings loaded: ${settings.SYMBOLS_LIST.length} symbols configured`);
    return settings;
  } catch (err) {
    console.error(`✗ Failed to load settings from ${SETTINGS_FILE}:`, err.message);
    process.exit(1);
  }
}

// --- 2. Create Redis Client ---
async function createRedisClient() {
  const client = Redis.createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      reconnectStrategy: (retries) => Math.min(retries * 100, MAX_RECONNECT_DELAY * 1000),
    },
    database: REDIS_DB,
  });

  client.on("error", (err) => console.error("Redis error:", err.message));

  await client.connect();
  console.log(`✓ Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);

  return client;
}

// --- 3. Handle WebSocket Messages ---
async function handleMessage(msg, redisClient, redisKey, symbol) {
  try {
    const data = msg.data.toString();
    const parsed = JSON.parse(data); // Validate JSON
    
    await redisClient.set(redisKey, data);
    
    console.log(`[${symbol}] Stored to '${redisKey}': ${data.slice(0, 100)}...`);
  } catch (err) {
    console.error(`[${symbol}] Error processing message:`, err.message);
  }
}

// --- 4. Create WebSocket Connection for Single Symbol ---
function createSymbolConnection(symbol, index, redisClient, manualReconnect$, shutdown$) {
  const url = `${BINANCE_WS_BASE}${symbol.toLowerCase()}@kline_1m`;
  const redisKey = `new_1m_candle_${index}`;

  let currentReconnectDelay = RECONNECT_DELAY * 1000;
  let connectionCount = 0; // Track connections for rate limit (300 per 5 min)
  let connectionTimestamps = [];

  const connect = () => {
    return defer(() => {
      // Check Binance rate limit: 300 connections per 5 minutes
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      connectionTimestamps = connectionTimestamps.filter(t => t > fiveMinutesAgo);

      if (connectionTimestamps.length >= 300) {
        console.warn(`[${symbol}] ⚠ Rate limit: 300 connections/5min reached. Waiting...`);
        currentReconnectDelay = Math.max(currentReconnectDelay, 60 * 1000); // Wait at least 1 minute
      }

      connectionTimestamps.push(Date.now());
      connectionCount++;

      console.log(`[${symbol}] Connecting to ${url}... (attempt #${connectionCount})`);
      const ws = new WebSocket(url);

      // Health check subject to detect dead connections
      const healthCheck$ = new Subject();
      let lastMessageTime = Date.now();

      // Auto-reconnect timer (23 hours by default - Binance disconnects at 24h)
      const periodicReconnect$ = timer(RECONNECT_AFTER_HOURS * 3600 * 1000).pipe(
        tap(() => console.log(`[${symbol}] ${RECONNECT_AFTER_HOURS}h limit reached. Reconnecting...`))
      );

      // Health check timer - triggers if no messages received within timeout
      const healthCheckTimer$ = timer(0, 60 * 1000).pipe(
        tap(() => {
          const timeSinceLastMessage = Date.now() - lastMessageTime;
          if (timeSinceLastMessage > HEALTH_CHECK_TIMEOUT) {
            console.warn(`[${symbol}] ⚠ No messages for ${Math.floor(timeSinceLastMessage / 1000)}s. Connection appears dead.`);
            healthCheck$.next();
          }
        }),
        takeUntil(healthCheck$)
      );

      const open$ = fromEvent(ws, "open").pipe(
        tap(() => {
          console.log(`[${symbol}] ✓ Connected at ${new Date().toISOString()}`);
          currentReconnectDelay = RECONNECT_DELAY * 1000; // Reset delay on success
          lastMessageTime = Date.now(); // Reset health check timer
        })
      );

      // CRITICAL: Binance requires pong response within 60 seconds
      const ping$ = fromEvent(ws, "ping").pipe(
        tap((data) => {
          ws.pong(data); // Respond with same payload
          console.log(`[${symbol}] ← ping, → pong`);
          lastMessageTime = Date.now(); // Update health check timer
        })
      );

      const message$ = fromEvent(ws, "message").pipe(
        tap(() => {
          lastMessageTime = Date.now(); // Update health check timer on every message
        }),
        mergeMap((msg) => handleMessage(msg, redisClient, redisKey, symbol)),
        catchError((err) => {
          console.error(`[${symbol}] Message handler error:`, err.message);
          return []; // Continue stream
        })
      );

      const close$ = fromEvent(ws, "close").pipe(
        tap((event) => {
          console.warn(`[${symbol}] WebSocket closed (${event.code}): ${event.reason || "No reason"}`);
        })
      );

      const error$ = fromEvent(ws, "error").pipe(
        tap((err) => console.error(`[${symbol}] WebSocket error:`, err.message))
      );

      // Merge all event streams (including ping$ for Binance heartbeat requirement)
      return merge(open$, ping$, message$, close$, error$, periodicReconnect$, healthCheckTimer$, healthCheck$).pipe(
        takeUntil(merge(manualReconnect$, shutdown$)),
        finalize(() => {
          console.log(`[${symbol}] Closing WebSocket...`);
          healthCheck$.complete();
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close(1000, "Normal closure");
          }
        })
      );
    });
  };

  // Single unified connection stream with auto-reconnect
  const connectionStream$ = defer(() => connect()).pipe(
    catchError((err) => {
      console.error(`[${symbol}] Connection error:`, err.message);
      console.log(`[${symbol}] Reconnecting in ${currentReconnectDelay / 1000}s...`);
      return timer(currentReconnectDelay).pipe(
        tap(() => {
          // Increase delay for next reconnection (exponential backoff)
          currentReconnectDelay = Math.min(
            currentReconnectDelay * 2,
            MAX_RECONNECT_DELAY * 1000
          );
        }),
        switchMap(() => connectionStream$)
      );
    })
  );

  // Handle manual reconnects
  const reconnectStream$ = manualReconnect$.pipe(
    switchMap(() => {
      console.log(`[${symbol}] Manual reconnect triggered...`);
      currentReconnectDelay = RECONNECT_DELAY * 1000; // Reset delay on manual reconnect
      return connectionStream$;
    }),
    takeUntil(shutdown$)
  );

  // Subscribe to both streams
  reconnectStream$.subscribe({
    error: (err) => console.error(`[${symbol}] Fatal error in reconnect stream:`, err.message),
    complete: () => console.log(`[${symbol}] Reconnect stream completed`)
  });

  // Start initial connection
  connectionStream$.subscribe({
    complete: () => {
      console.log(`[${symbol}] Connection stream completed, triggering reconnect...`);
      manualReconnect$.next();
    },
    error: (err) => {
      console.error(`[${symbol}] Initial connection error:`, err.message);
      manualReconnect$.next();
    }
  });
}

// --- 5. Multi-Symbol WebSocket Manager ---
class WebSocketManager {
  constructor(redisClient, settings) {
    this.redisClient = redisClient;
    this.settings = settings;
    this.shutdown$ = new Subject();
    this.reconnectSubjects = new Map(); // Map<symbol, Subject>
    this.symbolShutdowns = new Map(); // Map<symbol, Subject> - for individual symbol shutdown
    this.symbolIndices = new Map(); // Map<symbol, index> - persistent indices for Redis keys
    this.watcher = null;

    // Initialize symbol indices
    this.initializeSymbolIndices();
  }

  initializeSymbolIndices() {
    // Assign persistent indices to symbols
    this.settings.SYMBOLS_LIST.forEach((symbol, index) => {
      this.symbolIndices.set(symbol, index);
    });
  }

  getSymbolIndex(symbol) {
    // Get existing index or assign new one
    if (!this.symbolIndices.has(symbol)) {
      // Find the next available index
      const usedIndices = new Set(this.symbolIndices.values());
      let nextIndex = 0;
      while (usedIndices.has(nextIndex)) {
        nextIndex++;
      }
      this.symbolIndices.set(symbol, nextIndex);
      console.log(`[${symbol}] Assigned new persistent index: ${nextIndex}`);
    }
    return this.symbolIndices.get(symbol);
  }

  async start() {
    // Setup file watcher
    this.setupFileWatcher();

    // Start connections for all symbols
    this.startAllConnections();

    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  setupFileWatcher() {
    this.watcher = chokidar.watch(SETTINGS_FILE, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
      usePolling: true, // Better for Docker/VM environments
    });

    this.watcher.on("change", async () => {
      try {
        console.log("\n⟳ Settings file changed, reloading...");
        const newSettings = await loadSettings();

        // Check if symbols list changed
        const oldSymbols = new Set(this.settings.SYMBOLS_LIST);
        const newSymbols = new Set(newSettings.SYMBOLS_LIST);

        const added = [...newSymbols].filter(s => !oldSymbols.has(s));
        const removed = [...oldSymbols].filter(s => !newSymbols.has(s));
        const remained = [...newSymbols].filter(s => oldSymbols.has(s));

        if (added.length > 0) {
          console.log(`  + Adding symbols: ${added.join(", ")}`);
        }
        if (removed.length > 0) {
          console.log(`  - Removing symbols: ${removed.join(", ")}`);
        }
        if (remained.length > 0) {
          console.log(`  ⟳ Reconnecting symbols: ${remained.join(", ")}`);
        }

        // Stop removed symbols (but keep their indices for potential re-add)
        for (const symbol of removed) {
          const symbolShutdown$ = this.symbolShutdowns.get(symbol);
          if (symbolShutdown$) {
            symbolShutdown$.next();
            symbolShutdown$.complete();
            this.symbolShutdowns.delete(symbol);
          }

          const reconnect$ = this.reconnectSubjects.get(symbol);
          if (reconnect$) {
            reconnect$.complete();
            this.reconnectSubjects.delete(symbol);
          }

          // Note: We intentionally keep symbolIndices to maintain consistency
          // If symbol is re-added later, it will use the same Redis key
        }

        // Update settings
        this.settings = newSettings;

        // Reconnect existing symbols
        for (const symbol of remained) {
          const reconnect$ = this.reconnectSubjects.get(symbol);
          if (reconnect$) {
            reconnect$.next();
          }
        }

        // Start new symbols
        for (const symbol of added) {
          const index = this.getSymbolIndex(symbol);
          this.startSymbolConnection(symbol, index);
        }

        console.log("✓ Settings reload complete\n");
      } catch (err) {
        console.error("✗ Error reloading settings:", err.message);
      }
    });

    this.watcher.on("error", (err) => {
      console.error("File watcher error:", err.message);
    });
  }

  startAllConnections() {
    console.log(`\n🚀 Starting WebSocket connections for ${this.settings.SYMBOLS_LIST.length} symbols...\n`);

    this.settings.SYMBOLS_LIST.forEach((symbol) => {
      const index = this.getSymbolIndex(symbol);
      this.startSymbolConnection(symbol, index);
    });
  }

  startSymbolConnection(symbol, index) {
    const reconnect$ = new Subject();
    const symbolShutdown$ = new Subject();

    this.reconnectSubjects.set(symbol, reconnect$);
    this.symbolShutdowns.set(symbol, symbolShutdown$);

    createSymbolConnection(
      symbol,
      index,
      this.redisClient,
      reconnect$,
      merge(symbolShutdown$, this.shutdown$)
    );
  }

  setupGracefulShutdown() {
    const shutdown = async () => {
      console.log("\n\n⏸  Shutting down gracefully...");
      
      // Stop all connections
      this.shutdown$.next();
      this.shutdown$.complete();

      // Complete all reconnect subjects
      for (const reconnect$ of this.reconnectSubjects.values()) {
        reconnect$.complete();
      }
      this.reconnectSubjects.clear();

      // Complete all symbol shutdown subjects
      for (const symbolShutdown$ of this.symbolShutdowns.values()) {
        symbolShutdown$.complete();
      }
      this.symbolShutdowns.clear();

      // Close file watcher
      if (this.watcher) {
        await this.watcher.close();
        console.log("✓ File watcher closed");
      }

      // Close Redis
      await this.redisClient.quit();
      console.log("✓ Redis connection closed");

      console.log("✓ Shutdown complete\n");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
}

// --- Main ---
(async () => {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Binance WebSocket → Redis Multi-Symbol Connector");
  console.log("═══════════════════════════════════════════════════\n");

  const settings = await loadSettings();
  const redisClient = await createRedisClient();

  console.log(`Settings file: ${SETTINGS_FILE}`);
  console.log(`Redis: ${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}`);
  console.log(`Symbols: ${settings.SYMBOLS_LIST.join(", ")}\n`);

  const manager = new WebSocketManager(redisClient, settings);
  await manager.start();
})();