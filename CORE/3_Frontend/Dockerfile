FROM node:24-slim

WORKDIR /app

# Устанавливаем curl для healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Копируем package.json из корня проекта
COPY package*.json ./

# Устанавливаем зависимости с ограничением памяти
RUN npm install --omit=dev --prefer-offline --no-audit || npm install --omit=dev

# Копируем необходимые файлы
COPY CORE/1_Redis/ ./CORE/1_Redis/
COPY CORE/3_Frontend/ ./CORE/3_Frontend/
COPY CORE/4_Data/ ./CORE/4_Data/
COPY settings.yaml ./settings.yaml

# Expose порт для SSE сервера
EXPOSE 3000

# Запуск обоих сервисов через shell
CMD ["sh", "-c", "node /app/CORE/1_Redis/websocket.js & sleep 3 && node /app/CORE/3_Frontend/sse_server.js"]
