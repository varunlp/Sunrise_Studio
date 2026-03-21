FROM node:20-bookworm AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/hotel.db

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./
COPY public ./public

RUN mkdir -p /app/data \
    && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "server.js"]
