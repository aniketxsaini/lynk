# ==========================================
# Stage 1: Build Stage (TypeScript compilation)
# ==========================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to dist
RUN npm run build

# Copy SQL migrations into dist directory so they exist alongside compiled code
RUN mkdir -p dist/db/migrations && cp -r src/db/migrations/* dist/db/migrations/

# ==========================================
# Stage 2: Production Stage (Minimal runtime)
# ==========================================
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package manifests
COPY package*.json ./

# Install ONLY production dependencies and clean cache
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript output and migration files from the builder stage
COPY --from=builder /app/dist ./dist

# Switch to standard non-root user for security
USER node

# Expose backend port
EXPOSE 3000

# Start production server
CMD ["node", "dist/server.js"]
