FROM node:24-slim

WORKDIR /app

# Создать структуру директорий
RUN mkdir -p CORE/1_Redis

# Скопировать package.json и package-lock.json
COPY package*.json ./

# Установить зависимости
RUN npm install

# Скопировать остальной код
COPY . .

# Запуск websocket.js
CMD ["node", "CORE/1_Redis/websocket.js"]