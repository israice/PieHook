# RUN
npm install
node run.js

# UPDATE
git add .
git commit -m "v0.0.1 - полный готовый цыкл пополнения history candles"
git push

# RESTORE
git log --oneline -n 10

Copy-Item .env $env:TEMP\.env.backup
git reset --hard de8b98f
git clean -fd
Copy-Item $env:TEMP\.env.backup .env -Force
git push origin master --force  

### Dev Roadmap
v0.0.1 - полный готовый цыкл пополнения history candles
