# Rate Limit Configuration

## Overview
This WebSocket connector implements Binance rate limit protection to prevent IP blocking when running multiple instances.

## Binance Rate Limits
- **WebSocket connections**: 300 connections per 5 minutes per IP address
- **Exceeding this limit** will result in temporary IP blocking by Binance

## Configuration

### Environment Variable
Set `MAX_CONNECTIONS_PER_5MIN` to configure the rate limit per instance:

```bash
# For 2 servers on same IP
MAX_CONNECTIONS_PER_5MIN=140

# For 3 servers on same IP
MAX_CONNECTIONS_PER_5MIN=100

# For single server
MAX_CONNECTIONS_PER_5MIN=300
```

### Default Value
If not set, defaults to **140** (safe for 2-server setup)

### Docker Compose
Already configured in `docker-compose.prod.yml` and `docker-compose.dev.yml`:

```yaml
environment:
  - MAX_CONNECTIONS_PER_5MIN=140
```

## Multi-Server Setup

### Scenario 1: Same IP Address (Home/Office Network)
If running multiple servers behind the same router/NAT:

```
Server 1 (Windows) ──┐
                     ├──> Router (IP: 93.123.45.67) ──> Binance
Server 2 (Linux)   ──┘
```

**Configuration for each server:**
```yaml
MAX_CONNECTIONS_PER_5MIN=140  # 140 × 2 = 280 (safe, 20 spare)
```

**For 3 servers:**
```yaml
MAX_CONNECTIONS_PER_5MIN=100  # 100 × 3 = 300 (exact limit)
```

### Scenario 2: Different IP Addresses (Separate Networks)
If servers are on different networks:

```
Server 1 (Home) ──> IP: 93.123.45.67 ──> Binance
Server 2 (VPS)  ──> IP: 185.67.89.12 ──> Binance
```

**Configuration for each server:**
```yaml
MAX_CONNECTIONS_PER_5MIN=300  # Each can use full limit independently
```

## Log Output Examples

### Normal Operation
```
[XRPUSDT] Connecting to wss://fstream.binance.com/ws/xrpusdt@kline_1m... (attempt #1)
[XRPUSDT] ✓ Connected at 2026-01-06T12:00:00.000Z
```

### Warning Levels

**50% Used (70/140 connections):**
```
[BTCUSDT] ℹ️  Rate limit: 70/140 connections in last 5min (50% used)
```

**70% Used (98/140 connections):**
```
[ETHUSDT] ⚠  MEDIUM: 98/140 connections in last 5min (70% used)
```

**85% Used (119/140 connections):**
```
[SOLUSDT] ⚠️  HIGH: Rate limit warning! 119/140 connections in last 5min (85% used)
```

**CRITICAL - Limit Exceeded (140+ connections):**
```
[ADAUSDT] 🚨 CRITICAL: Rate limit exceeded! 140/140 connections in last 5min. BLOCKING NEW CONNECTION.
```

## Monitoring Rate Limit

### Check Your External IP
On each server, run:
```bash
curl ifconfig.me
```

If IPs are **the same** → you're sharing the rate limit
If IPs are **different** → each server has independent limit

### Startup Information
On startup, the connector displays current configuration:
```
═══════════════════════════════════════════════════
  Binance WebSocket → Redis Multi-Symbol Connector
═══════════════════════════════════════════════════

Settings file: ./settings.yaml
Redis: redis:6379/0
Rate limit: 140 connections per 5 minutes
Symbols: XRPUSDT, BTCUSDT, ETHUSDT
```

## Troubleshooting

### Getting IP Blocked by Binance?
1. Check if you're running multiple instances on same IP
2. Verify `MAX_CONNECTIONS_PER_5MIN` is set correctly on ALL instances
3. Monitor logs for `CRITICAL` rate limit messages
4. If blocked, wait 5-10 minutes before reconnecting

### Too Many Reconnections?
Common causes:
- Network instability
- Frequent `settings.yaml` changes
- Multiple servers with misconfigured limits

Check logs for reconnection patterns and adjust accordingly.

### Calculating Optimal Limit
```
Optimal Limit = 300 / Number of Servers on Same IP

Examples:
- 1 server:  300 / 1 = 300
- 2 servers: 300 / 2 = 150 (use 140 for safety margin)
- 3 servers: 300 / 3 = 100
- 4 servers: 300 / 4 = 75
```

## Best Practices

1. **Always leave safety margin**: Use 90-95% of calculated limit
2. **Monitor logs regularly**: Watch for warning messages
3. **Coordinate deployments**: Don't restart all servers simultaneously
4. **Document your setup**: Keep track of how many instances are running
5. **Test configuration**: Start with conservative limits and increase gradually
