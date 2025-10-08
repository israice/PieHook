## PieHook 


### Перед первы запуском
npm install ws redis yaml rxjs node-fetch js-yaml

### Run Redis Docker
docker-compose up -d --build

### Запуск
node run.js

---

### Dev Roadmap
- [ ] v.0.0.5 get all candles [0] and save in history file 
- [x] v.0.0.4 created A_clone_candle[0]
- [x] v.0.0.3 created A_get_candle[0]_from_redis
- [x] v.0.0.2 created js websocket to save in Redis
- [x] v.0.0.1 created docker with Redis for candle data based websocket 

git add .
git commit -m "create list of scripts for A_run_create_packs.py"
git push


git init
git add .
git commit -m "v.0.0.1 created docker with Redis for candle data based websocket"
gh repo create
