FROM node:24-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev --prefer-offline --no-audit || npm install --omit=dev

# Copy application files
COPY CORE/1_Redis/ ./CORE/1_Redis/
COPY CORE/2_Backend/ ./CORE/2_Backend/
COPY CORE/4_Data/ ./CORE/4_Data/
COPY CORE/6_Tools/ ./CORE/6_Tools/
COPY settings.yaml ./settings.yaml
COPY run.js ./run.js

# Start the backend
CMD ["node", "run.js"]
