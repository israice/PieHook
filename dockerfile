FROM node:24-slim

WORKDIR /app

# Скопировать package.json и package-lock.json
COPY package*.json ./

# Установить зависимости
RUN npm install

# Скопировать остальной код
COPY . .

# Запуск websocket.js
CMD ["node", "1-Redis/websocket.js"]