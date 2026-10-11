# Сайт автосервиса на движке doccar — Next.js 14 (серверный рантайм: сайт, админка, CRM, ЛК).
# Node 24: встроенный node:sqlite (CRM-база data/crm.db) — без нативных модулей.
FROM node:24-alpine
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
