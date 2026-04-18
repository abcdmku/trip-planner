FROM node:20-bookworm-slim

WORKDIR /app

ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=5173

EXPOSE 5173

CMD ["sh", "-c", "npx prisma migrate deploy && node --import tsx server/index.ts"]
