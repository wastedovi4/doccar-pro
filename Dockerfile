# DOCCAR.PRO — Next.js 14 (серверный рантайм: админка + API).
FROM node:20-alpine
WORKDIR /app

# Зависимости отдельным слоем для кеша.
COPY package.json package-lock.json ./
RUN npm ci

# Исходники + продовая сборка.
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# next start слушает 0.0.0.0:3000
CMD ["npm", "run", "start"]
