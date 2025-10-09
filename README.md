## PieHook-JS


### Перед первы запуском
npm install ws redis yaml rxjs node-fetch js-yaml

### Run Redis Docker
docker-compose up -d --build

### Поглазеть на поток Websocket
docker-compose logs -f websocket_client

### Запуск
node run.js

---

### Dev Roadmap
- [ ] v.0.0.8 check for each timeframe percent and trend 
- [ ] v.0.0.7 get all other candles [0] and save in history file
- [x] v.0.0.6 created A_pre_start B_reset C_after_finish
- [x] v.0.0.5 created main runner and backend runner
- [x] v.0.0.4 created A_clone_candle[0]
- [x] v.0.0.3 created A_get_candle[0]_from_redis
- [x] v.0.0.2 created js websocket to save in Redis
- [x] v.0.0.1 created docker with Redis for candle data based websocket 


# Github Update
git add .
git commit -m "v.0.0.6 created A_pre_start B_reset C_after_finish"
git push

