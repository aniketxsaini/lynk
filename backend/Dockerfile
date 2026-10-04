# ==========================================
# Stage 1: Build Stage
# ==========================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./

# Install all dependencies including devDependencies
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

RUN npm run build

RUN mkdir -p dist/db/migrations && \
    cp -r src/db/migrations/* dist/db/migrations/


# ==========================================
# Stage 2: Runtime
# ==========================================
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=development

COPY package*.json ./

RUN npm ci && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src

RUN mkdir -p /app/tmp && chown node:node /app/tmp

USER node

EXPOSE 3000

CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]