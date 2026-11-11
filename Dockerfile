FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    libreoffice-writer \
    python3 \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install --include=dev --no-audit --no-fund

COPY . .

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
