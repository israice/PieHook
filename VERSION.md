
## update repository

```Bash
git add .
git commit -m "v0.0.9 - added screenshots"
git push
```

```Powershell
git log --oneline -n 10
```

```Powershell
Copy-Item .env $env:TEMP\.env.backup
git reset --hard de8b98f
git clean -fd
Copy-Item $env:TEMP\.env.backup .env -Force
git push origin master --force  
```

### Dev Roadmap
- [x] v0.0.1 - created docker with Redis for candle data based 
- [x] v0.0.2 - created js websocket to save in Rediswebsocket 
- [x] v0.0.3 - created A_get_candle[0]_from_redis
- [x] v0.0.4 - created A_clone_candle[0]
- [x] v0.0.5 - created main runner and backend runner
- [x] v0.0.6 - created A_pre_start B_reset C_after_finish
- [x] v0.0.7 - created screenshot.png
  - fxed redis websocket and A_get_candle[0]_from_redis
  - added SSE method for web page live updates from csv file
  - added tradingview style to froendend page 
  - added docker-compose.prod.yml
  - added AUTOUPDATE_WEBHOOK_FROM_GITHUB
- [x] v0.0.8 - added version
v0.0.9 - added screenshots