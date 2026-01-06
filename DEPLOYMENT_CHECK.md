# 🔍 Deployment Configuration Check

## ✅ Проверка конфигурации для одновременной работы PROD + DEV

### 📊 Текущая конфигурация (после исправлений):

| Сервер | Окружение | Контейнер | Запускает websocket.js | MAX_CONNECTIONS_PER_5MIN | Статус |
|--------|-----------|-----------|------------------------|--------------------------|--------|
| **PROD (Linux)** | Production | `PieHook-Backend` | ❌ НЕТ (только run.js) | 140 | ⚠️ Не используется |
| **PROD (Linux)** | Production | `PieHook-Frontend` | ✅ ДА | 140 | ✅ Правильно |
| **DEV (Windows)** | Development | `PieHook-Frontend` | ✅ ДА | 140 | ✅ Правильно |

### 🎯 Итоговый расчёт:

```
PROD Frontend:  140 лимит на 5 минут
DEV Frontend:   140 лимит на 5 минут
────────────────────────────────────
ИТОГО:          280 подключений max
```

**Лимит Binance**: 300 подключений за 5 минут
**Запас безопасности**: 20 подключений (7%)
**Результат**: ✅ **БЕЗОПАСНО**

---

## 📝 Где запускается websocket.js:

### PROD (docker-compose.prod.yml):

**Backend контейнер (НЕ запускает websocket.js):**
```yaml
backend:
  environment:
    - MAX_CONNECTIONS_PER_5MIN=140  # ⚠️ Не используется, т.к. тут только run.js
```

**Frontend контейнер (ЗАПУСКАЕТ websocket.js):**
```yaml
frontend:
  environment:
    - MAX_CONNECTIONS_PER_5MIN=140  # ✅ Используется websocket.js
```

CMD в `CORE/3_Frontend/Dockerfile`:
```bash
node /app/CORE/1_Redis/websocket.js & node /app/CORE/3_Frontend/sse_server.js
```

### DEV (docker-compose.dev.yml):

**Frontend контейнер (ЗАПУСКАЕТ websocket.js):**
```yaml
frontend:
  environment:
    - MAX_CONNECTIONS_PER_5MIN=140  # ✅ Используется websocket.js
```

---

## 🧪 Как проверить правильность работы:

### 1. Проверить IP адреса

**На PROD (Linux):**
```bash
curl ifconfig.me
```

**На DEV (Windows):**
```bash
curl ifconfig.me
```

Если IP **одинаковый** → настройка 140/140 правильная ✅
Если IP **разные** → можно увеличить до 300 каждый

### 2. Проверить логи при запуске

**PROD:**
```bash
docker logs PieHook-Frontend -f
```

Должно быть:
```
═══════════════════════════════════════════════════
  Binance WebSocket → Redis Multi-Symbol Connector
═══════════════════════════════════════════════════

Settings file: ./settings.yaml
Redis: redis:6379/0
Rate limit: 140 connections per 5 minutes  ← ПРОВЕРИТЬ ЭТО!
Symbols: XRPUSDT
```

**DEV:**
```bash
docker logs PieHook-Frontend -f
```

Должно быть:
```
Rate limit: 140 connections per 5 minutes  ← ПРОВЕРИТЬ ЭТО!
```

### 3. Мониторинг rate limit

При достижении 50% (70 подключений) вы увидите:
```
[XRPUSDT] ℹ️  Rate limit: 70/140 connections in last 5min (50% used)
```

При 85% появится:
```
[XRPUSDT] ⚠️  HIGH: Rate limit warning! 119/140 connections in last 5min (85% used)
```

При превышении:
```
[XRPUSDT] 🚨 CRITICAL: Rate limit exceeded! 140/140 connections in last 5min. BLOCKING NEW CONNECTION.
```

---

## ⚙️ Настройка для разных сценариев:

### Сценарий 1: Один IP (текущая конфигурация)
```yaml
# PROD frontend
MAX_CONNECTIONS_PER_5MIN=140

# DEV frontend
MAX_CONNECTIONS_PER_5MIN=140

# Итого: 280 / 300 = 93% использования ✅
```

### Сценарий 2: Разные IP адреса
```yaml
# PROD frontend
MAX_CONNECTIONS_PER_5MIN=300

# DEV frontend
MAX_CONNECTIONS_PER_5MIN=300

# Каждый независимо, блокировки не будет ✅
```

### Сценарий 3: 3 сервера на одном IP
```yaml
# Все три сервера
MAX_CONNECTIONS_PER_5MIN=100

# Итого: 100 × 3 = 300 (точно на лимите) ⚠️
```

---

## 🚨 Важные моменты:

1. **Backend контейнер НЕ нужен для rate limit** - он не запускает websocket.js
2. **Только Frontend контейнеры** подключаются к Binance
3. **Лимит считается ПО IP-адресу**, а не по контейнеру
4. **Каждый Frontend** должен иметь `MAX_CONNECTIONS_PER_5MIN=140`
5. **Запас 20 подключений** даёт буфер для синхронизации времени

---

## ✅ Checklist перед запуском:

- [x] ✅ websocket.js обновлён с логированием rate limit
- [x] ✅ docker-compose.prod.yml → frontend → MAX_CONNECTIONS_PER_5MIN=140
- [x] ✅ docker-compose.dev.yml → frontend → MAX_CONNECTIONS_PER_5MIN=140
- [ ] 🔲 Проверить IP адреса (curl ifconfig.me)
- [ ] 🔲 Запустить PROD и проверить логи
- [ ] 🔲 Запустить DEV и проверить логи
- [ ] 🔲 Убедиться что оба показывают "Rate limit: 140 connections per 5 minutes"
- [ ] 🔲 Мониторить логи на warning сообщения

---

## 🎯 Итоговый вывод:

**Код настроен правильно! ✅**

При одновременной работе PROD + DEV на одном IP:
- Каждый использует лимит 140 подключений
- Суммарно: 280 подключений (безопасно)
- Запас: 20 подключений до блокировки
- Логирование покажет приближение к лимиту

**Можно безопасно запускать оба сервера одновременно!** 🚀
