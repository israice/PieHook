FROM node:24-alpine

WORKDIR /app

# Устанавливаем curl для healthcheck
RUN apk add --no-cache curl

# Копируем package.json из корня проекта
COPY package*.json ./

# Устанавливаем зависимости с ограничением памяти
RUN npm install --omit=dev --prefer-offline --no-audit || npm install --omit=dev

# Копируем необходимые файлы
COPY CORE/1_Redis/ ./CORE/1_Redis/
COPY CORE/3_Frontend/ ./CORE/3_Frontend/
COPY CORE/4_Data/ ./CORE/4_Data/
# settings.yaml is mounted as volume at runtime for dynamic updates

# Expose порт для SSE сервера
EXPOSE 3000

# Запуск обоих сервисов через shell
CMD ["sh", "-c", "node /app/CORE/1_Redis/websocket.js & sleep 3 && node /app/CORE/3_Frontend/sse_server.js"]
