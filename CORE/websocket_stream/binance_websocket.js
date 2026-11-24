import fsp from "node:fs/promises";

// ============================================================
// binance_websocket
// ============================================================

const SHOW_EXECUTION_TIME = false;
const SHOW_COMMENT = false;
const COMMENT_TEXT = "My custom comment";
const SETTINGS_FILE = "THE_SETTINGS.yaml";
const CSV_FILE = "CORE/websocket_stream/binance_websocket.csv";
const CSV_HEADER = ["pair", "timeframe", "candle", "close", "open", "high", "low", "open_time", "update_time", "close_time"];
const THE_PAIRS_KEY = "THE_PAIRS";
const THE_TIMEFRAMES_KEY = "THE_TIMEFRAMES";

const WS_URL = "wss://fstream.binance.com/market/stream";
const MAX_STREAMS = 1024;
const BATCH_SIZE = 200;
const BATCH_GAP_SEC = 0.2;
const SETTINGS_CHECK_SEC = 2.0;
const CSV_WRITE_SEC = 1.0;
const IDLE_TIMEOUT_SEC = 120.0;
const ACK_TIMEOUT_SEC = 10.0;
const STALE_CHECK_SEC = 10.0;
const ROTATE_AFTER_SEC = 23 * 3600;
const RECONNECT_BASE_SEC = 3.0;
const RECONNECT_MAX_SEC = 60.0;
const RECONNECT_RESET_SEC = 30.0;
const VALID_INTERVALS = new Set(["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"]);
const SYMBOL_PATTERN = /^[A-Z0-9]{2,30}$/;

// ============================================================
// SHARED STATE
// ============================================================

const state = new Map();
const lastEvent = new Map();
const lastUpdate = new Map();
const staleReported = new Set();

class AsyncEvent {
  #set = false;
  #waiters = [];
  isSet = () => this.#set;
  set = () => { this.#set = true; while (this.#waiters.length > 0) this.#waiters.shift()(); };
  clear = () => { this.#set = false; };
  wait = () => this.#set ? Promise.resolve() : new Promise((res) => this.#waiters.push(res));
}

const dirty = new AsyncEvent();
const primed = new Set();
let firstWriteDone = false;
let expectedCount = 0;

// ============================================================
// HELPERS
// ============================================================

const monotonicSec = () => performance.now() / 1000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = (promise, ms, message = "Operation timed out") => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); }),
  ]).finally(() => clearTimeout(timer));
};

const fallbackYamlParse = (text) => {
  const result = {};
  let currentKey = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const commentIdx = rawLine.indexOf("#");
    const line = (commentIdx >= 0 ? rawLine.slice(0, commentIdx) : rawLine).trimEnd();
    if (!line.trim()) continue;

    const listMatch = line.match(/^(\s*)-\s*(.*)$/);
    if (listMatch) {
      if (currentKey) {
        if (!Array.isArray(result[currentKey])) result[currentKey] = [];
        let val = listMatch[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
        result[currentKey].push(val);
      }
      continue;
    }

    const kvMatch = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      let val = kvMatch[2].trim();
      currentKey = key;
      if (!val) {
        result[key] = [];
      } else {
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
        else if (val === "true" || val === "TRUE") val = true;
        else if (val === "false" || val === "FALSE") val = false;
        else if (!Number.isNaN(Number(val)) && val !== "") val = Number(val);
        result[key] = val;
      }
    }
  }
  return result;
};

const parseYaml = async (text) => {
  try {
    const m = await import("yaml");
    const parse = m.parse ?? m.default?.parse;
    if (typeof parse === "function") return parse(text);
  } catch {}
  try {
    const m = await import("js-yaml");
    const load = m.load ?? m.default?.load;
    if (typeof load === "function") return load(text);
  } catch {}
  return fallbackYamlParse(text);
};

const loadStreams = async () => {
  const rawText = await fsp.readFile(SETTINGS_FILE, "utf8");
  const cfg = (await parseYaml(rawText)) || {};
  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) throw new ValueError("YAML root must be a mapping");

  const pairs = cfg[THE_PAIRS_KEY] ?? [];
  const timeframes = cfg[THE_TIMEFRAMES_KEY] ?? [];
  if (!Array.isArray(pairs)) throw new ValueError(`${THE_PAIRS_KEY} must be a list`);
  if (!Array.isArray(timeframes)) throw new ValueError(`${THE_TIMEFRAMES_KEY} must be a list`);

  const normalizedPairs = new Set();
  for (const pair of pairs) {
    if (typeof pair !== "string") throw new ValueError(`Invalid pair type: ${JSON.stringify(pair)}`);
    const trimmed = pair.trim().toUpperCase();
    if (!SYMBOL_PATTERN.test(trimmed)) throw new ValueError(`Invalid pair: ${JSON.stringify(pair)}`);
    normalizedPairs.add(trimmed.toLowerCase());
  }

  const normalizedTimeframes = new Set();
  for (const tf of timeframes) {
    if (typeof tf !== "string") throw new ValueError(`Invalid timeframe type: ${JSON.stringify(tf)}`);
    const trimmed = tf.trim();
    if (!VALID_INTERVALS.has(trimmed)) throw new ValueError(`Unsupported timeframe: ${JSON.stringify(tf)}`);
    normalizedTimeframes.add(trimmed);
  }

  const result = new Set();
  for (const p of normalizedPairs) {
    for (const tf of normalizedTimeframes) result.add(`${p}@kline_${tf}`);
  }
  return result;
};

const formatTime = (ms) => {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};

const saveCsv = async (rows) => {
  await fsp.mkdir("CORE/websocket_stream", { recursive: true });
  const tmpPath = `${CSV_FILE}.tmp`;
  const formatCell = (val) => {
    const s = String(val ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r") ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const content = [CSV_HEADER.join(","), ...rows.map((row) => row.map(formatCell).join(","))].join("\r\n") + "\r\n";
  await fsp.writeFile(tmpPath, content, "utf8");
  await fsp.rename(tmpPath, CSV_FILE);
};

const TF_MINUTES = {
  "1m": 1, "3m": 3, "5m": 5, "15m": 15, "30m": 30,
  "1h": 60, "2h": 120, "4h": 240, "6h": 360, "8h": 480, "12h": 720,
  "1d": 1440, "3d": 4320, "1w": 10080, "1M": 43200
};
const tfMinutes = (tf) => TF_MINUTES[tf] ?? Infinity;

const snapshot = () => Array.from(state.values()).sort((a, b) => {
  if (a[0] < b[0]) return -1;
  if (a[0] > b[0]) return 1;
  const ta = tfMinutes(a[1]);
  const tb = tfMinutes(b[1]);
  if (ta < tb) return -1;
  if (ta > tb) return 1;
  if (a[2] < b[2]) return -1;
  if (a[2] > b[2]) return 1;
  return 0;
});

const validateOhlc = (openPrice, high, low, close) => {
  try {
    if ([openPrice, high, low, close].some((v) => typeof v !== "string")) return false;
    const [o, h, l, c] = [Number(openPrice), Number(high), Number(low), Number(close)];
    if ([o, h, l, c].some((v) => !Number.isFinite(v) || v <= 0)) return false;
    return !(h < Math.max(o, c) || l > Math.min(o, c) || h < l);
  } catch {
    return false;
  }
};

const logException = (exc, prefix = "[ws]") => {
  if (exc?.name === "AggregateError" && Array.isArray(exc.errors)) {
    exc.errors.forEach((sub) => logException(sub, prefix));
  } else {
    console.log(`${prefix} ${exc?.name ?? "Error"}: ${exc?.message ?? exc}`);
  }
};

const toText = (data) => typeof data === "string" ? data : Buffer.isBuffer(data) ? data.toString("utf8") : data instanceof ArrayBuffer ? new TextDecoder().decode(data) : String(data);

const createWebSocket = async (url) => {
  let WsClass = globalThis.WebSocket;
  try {
    const wsModule = await import("ws");
    WsClass = wsModule.default ?? wsModule.WebSocket ?? wsModule;
  } catch {}
  if (!WsClass) throw new Error("No WebSocket client available. Please install 'ws' or run on Node.js 21+.");
  return new WsClass(url);
};

// ============================================================
// CUSTOM ERRORS
// ============================================================

class ValueError extends Error { constructor(m) { super(m); this.name = "ValueError"; } }
class RotationError extends Error { constructor(m = "Planned rotation") { super(m); this.name = "RotationError"; } }
class SubscriptionError extends Error { constructor(m) { super(m); this.name = "SubscriptionError"; } }
class ConnectionError extends Error { constructor(m) { super(m); this.name = "ConnectionError"; } }

// ============================================================
// CSV WRITER
// ============================================================

const csvWriter = async (abortSignal) => {
  while (!abortSignal?.aborted) {
    await dirty.wait();
    if (abortSignal?.aborted) break;
    await sleep(CSV_WRITE_SEC * 1000);
    dirty.clear();
    if (!firstWriteDone) {
      while (expectedCount > 0 && primed.size !== expectedCount) {
        if (abortSignal?.aborted) break;
        await sleep(200);
      }
      if (abortSignal?.aborted) break;
      firstWriteDone = true;
    }
    try {
      await saveCsv(snapshot());
    } catch (e) {
      console.log(`[csv] Write error: ${e?.message ?? e}`);
      dirty.set();
    }
  }
};

// ============================================================
// WEBSOCKET SESSION
// ============================================================

const session = async (parentSignal) => {
  const active = new Set();
  let nextRequestId = 1;
  const pendingAcks = new Map();
  let lastMarketData = monotonicSec();

  const sessionController = new AbortController();
  const { signal } = sessionController;
  const onParentAbort = () => sessionController.abort(parentSignal?.reason ?? new Error("Parent aborted"));
  parentSignal?.addEventListener("abort", onParentAbort);

  let rotateTimer = null;
  let pingIntervalId = null;
  let ws = null;

  try {
    ws = await createWebSocket(WS_URL);

    await new Promise((resolve, reject) => {
      const handleOpen = () => { cleanup(); resolve(); };
      const handleError = (e) => { cleanup(); reject(e?.error ?? e); };
      const handleClose = (e) => { cleanup(); reject(new ConnectionError(`WebSocket closed before open (code: ${e?.code ?? "unknown"})`)); };

      const cleanup = () => {
        if (typeof ws.off === "function") {
          ws.off("open", handleOpen); ws.off("error", handleError); ws.off("close", handleClose);
        } else if (typeof ws.removeEventListener === "function") {
          ws.removeEventListener("open", handleOpen); ws.removeEventListener("error", handleError); ws.removeEventListener("close", handleClose);
        }
      };

      if (typeof ws.on === "function") {
        ws.once("open", handleOpen); ws.once("error", handleError); ws.once("close", handleClose);
      } else if (typeof ws.addEventListener === "function") {
        ws.addEventListener("open", handleOpen, { once: true });
        ws.addEventListener("error", handleError, { once: true });
        ws.addEventListener("close", handleClose, { once: true });
      }
    });

    console.log("[ws] Connected");

    if (typeof ws.ping === "function") {
      pingIntervalId = setInterval(() => { if (ws.readyState === (ws.OPEN ?? 1)) ws.ping(); }, 60000);
    }

    rotateTimer = setTimeout(() => sessionController.abort(new RotationError()), ROTATE_AFTER_SEC * 1000);

    const send = async (method, streams) => {
      const sortedStreams = Array.from(streams).sort();
      for (let i = 0; i < sortedStreams.length; i += BATCH_SIZE) {
        if (signal.aborted) throw signal.reason ?? new Error("Session aborted");
        const batch = sortedStreams.slice(i, i + BATCH_SIZE);
        const requestId = String(nextRequestId++);

        let resolveAck, rejectAck;
        const ackPromise = new Promise((resolve, reject) => { resolveAck = resolve; rejectAck = reject; });
        pendingAcks.set(requestId, { resolve: resolveAck, reject: rejectAck });

        try {
          ws.send(JSON.stringify({ method, params: batch, id: requestId }));
          await withTimeout(ackPromise, ACK_TIMEOUT_SEC * 1000, `ACK timeout for id=${requestId}`);
          console.log(`[ws] ${method} ACK: ${batch.length} streams, id=${requestId}`);
        } finally {
          pendingAcks.delete(requestId);
        }
        await sleep(BATCH_GAP_SEC * 1000);
      }
    };

    const handleControlMessage = (msg) => {
      const requestId = String(msg?.id ?? "");
      const ack = pendingAcks.get(requestId);
      if (!ack) return console.log(`[ws] Unmatched control response: ${JSON.stringify(msg)}`);
      if ("code" in msg || "msg" in msg) return ack.reject(new SubscriptionError(`Binance rejected request: ${JSON.stringify(msg)}`));
      if ("result" in msg && msg.result === null) return ack.resolve(true);
      ack.reject(new SubscriptionError(`Unexpected ACK format: ${JSON.stringify(msg)}`));
    };

    const onMessage = (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return console.log("[ws] Invalid JSON"); }
      if (!msg || typeof msg !== "object" || Array.isArray(msg)) return console.log("[ws] Unexpected message structure");

      const data = msg.data;
      if (data == null) {
        if ("id" in msg) handleControlMessage(msg);
        else if ("code" in msg || "msg" in msg) console.log(`[ws] Binance error: ${JSON.stringify(msg)}`);
        else console.log(`[ws] Unknown message: ${JSON.stringify(msg)}`);
        return;
      }

      if (typeof data !== "object" || Array.isArray(data)) return console.log("[ws] Invalid data payload");
      const stream = msg.stream;
      if (typeof stream !== "string" || !active.has(stream) || data.e !== "kline") return;

      const k = data.k;
      if (!k || typeof k !== "object" || Array.isArray(k)) return console.log(`[ws] Invalid kline: ${stream}`);

      try {
        const [symbol, interval, openPrice, high, low, close] = [data.s, k.i, k.o, k.h, k.l, k.c];
        const [openTime, eventTime, closeTime] = [k.t, data.E, k.T];

        if (![openTime, eventTime, closeTime].every((v) => typeof v === "number" && Number.isInteger(v) && v >= 0)) throw new ValueError("Invalid timestamps");
        if (![symbol, interval, openPrice, high, low, close].every((v) => typeof v === "string")) throw new ValueError("Invalid field types");
        if (stream !== `${symbol.toLowerCase()}@kline_${interval}`) throw new ValueError("Stream mismatch");
        if (!validateOhlc(openPrice, high, low, close)) throw new ValueError("Invalid OHLC values");

        const version = { openTime, eventTime };
        const previous = lastEvent.get(stream);
        if (previous && (version.openTime < previous.openTime || (version.openTime === previous.openTime && version.eventTime < previous.eventTime))) return;

        const cell = {
          pair: symbol,
          timeframe: interval,
          candle: "0",
          close,
          open: openPrice,
          high,
          low,
          open_time: formatTime(openTime),
          update_time: formatTime(eventTime),
          close_time: formatTime(closeTime),
        };
        const row = CSV_HEADER.map((name) => cell[name]);
        const now = monotonicSec();

        lastEvent.set(stream, version);
        lastUpdate.set(stream, now);
        staleReported.delete(stream);
        lastMarketData = now;
        state.set(stream, row);
        primed.add(stream);
        dirty.set();
      } catch (e) {
        console.log(`[ws] Invalid kline ${stream}: ${e?.message ?? e}`);
      }
    };

    const handleMsgEvent = (raw) => onMessage(toText(raw));
    const handleCloseEvent = (code, reason) => sessionController.abort(new ConnectionError(`WebSocket closed (code: ${code}, reason: ${reason || "none"})`));
    const handleErrorEvent = (err) => sessionController.abort(err instanceof Error ? err : new ConnectionError(`WebSocket error: ${err}`));

    if (typeof ws.on === "function") {
      ws.on("message", handleMsgEvent);
      ws.on("close", handleCloseEvent);
      ws.on("error", handleErrorEvent);
    } else if (typeof ws.addEventListener === "function") {
      ws.addEventListener("message", (ev) => handleMsgEvent(ev.data));
      ws.addEventListener("close", (ev) => handleCloseEvent(ev.code, ev.reason));
      ws.addEventListener("error", (ev) => handleErrorEvent(ev.error ?? new ConnectionError("WebSocket error")));
    }

    const watcher = async () => {
      while (!signal.aborted) {
        let want = null;
        try {
          want = await loadStreams();
          if (want.size > MAX_STREAMS) throw new ValueError(`Too many streams: ${want.size} / ${MAX_STREAMS}`);
        } catch (e) {
          want = null;
        }

        if (want !== null) {
          expectedCount = want.size;
          const added = new Set([...want].filter((s) => !active.has(s)));
          const removed = new Set([...active].filter((s) => !want.has(s)));
          const gone = new Set([...state.keys()].filter((s) => !want.has(s)));

          if (added.size > 0 || removed.size > 0 || gone.size > 0) {
            for (const s of new Set([...gone, ...removed])) {
              state.delete(s); lastEvent.delete(s); lastUpdate.delete(s); staleReported.delete(s); primed.delete(s);
            }
            if (gone.size > 0) dirty.set();
            for (const s of removed) active.delete(s);
            for (const s of added) active.add(s);

            const now = monotonicSec();
            for (const s of added) lastUpdate.set(s, now);
            if (added.size > 0) lastMarketData = now;
            if (removed.size > 0) await send("UNSUBSCRIBE", removed);
            if (added.size > 0) await send("SUBSCRIBE", added);

          }
        }
        await sleep(SETTINGS_CHECK_SEC * 1000);
      }
    };

    const watchdog = async () => {
      while (!signal.aborted) {
        await sleep(STALE_CHECK_SEC * 1000);
        if (signal.aborted) break;
        if (active.size === 0) continue;

        const now = monotonicSec();
        const idle = now - lastMarketData;
        if (idle >= IDLE_TIMEOUT_SEC) throw new ConnectionError(`No market data on any active stream for ${idle.toFixed(0)}s`);

        for (const stream of Array.from(active)) {
          const age = now - (lastUpdate.get(stream) ?? now);
          if (age >= IDLE_TIMEOUT_SEC && !staleReported.has(stream)) {
            staleReported.add(stream);
            console.log(`[warning] Stale stream: ${stream}, no update for ${age.toFixed(0)}s`);
          }
        }
      }
    };

    const abortPromise = new Promise((_, reject) => {
      signal.aborted ? reject(signal.reason) : signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });

    await Promise.race([watcher(), watchdog(), abortPromise]);
  } finally {
    if (rotateTimer) clearTimeout(rotateTimer);
    if (pingIntervalId) clearInterval(pingIntervalId);
    parentSignal?.removeEventListener("abort", onParentAbort);
    for (const [, ack] of pendingAcks) ack.reject(new ConnectionError("Session terminated"));
    pendingAcks.clear();
    if (ws) {
      try {
        if (typeof ws.removeAllListeners === "function") ws.removeAllListeners();
        ws.close();
      } catch {}
    }
  }
};

// ============================================================
// SUPERVISOR
// ============================================================

const supervisor = async (abortSignal) => {
  let attempt = 0;
  while (!abortSignal?.aborted) {
    const started = monotonicSec();
    try {
      await session(abortSignal);
    } catch (e) {
      if (abortSignal?.aborted) break;
      if (e instanceof RotationError || e?.name === "RotationError") {
        console.log("[ws] Planned rotation");
        attempt = 0;
        continue;
      }
      logException(e);
    }
    if (abortSignal?.aborted) break;
    const delay = Math.min(RECONNECT_MAX_SEC, RECONNECT_BASE_SEC * Math.pow(2, attempt));
    attempt = monotonicSec() - started >= RECONNECT_RESET_SEC ? 0 : attempt + 1;
    console.log(`[ws] Reconnecting in ${delay.toFixed(1)}s`);
    await sleep((delay + Math.random()) * 1000);
  }
};

// ============================================================
// START
// ============================================================

const main = async () => {
  const startTime = SHOW_EXECUTION_TIME ? performance.now() : 0;
  if (SHOW_COMMENT) console.log(COMMENT_TEXT);

  const mainController = new AbortController();
  const shutdown = async () => {
    if (mainController.signal.aborted) return;
    mainController.abort();
    if (state.size > 0) {
      try { await saveCsv(snapshot()); } catch (e) { console.log(`[csv] Final write error: ${e?.message ?? e}`); }
    }
    if (SHOW_EXECUTION_TIME) console.log(`Execution time: ${((performance.now() - startTime) / 1000).toFixed(3)} seconds`);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await Promise.all([supervisor(mainController.signal), csvWriter(mainController.signal)]);
  } finally {
    if (state.size > 0) {
      try { await saveCsv(snapshot()); } catch (e) { console.log(`[csv] Final write error: ${e?.message ?? e}`); }
    }
  }
};

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
