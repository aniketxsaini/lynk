# 🔗 Lynk — URL Shortener API

A production-ready URL shortener backend built with **Node.js**, **TypeScript**, and a **polyglot persistence** strategy. Lynk is designed to handle high redirect throughput through Redis caching and offloads analytics writes via an asynchronous click-sync background job — minimizing database write pressure on the hot redirect path.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript |
| Framework | Express.js |
| Auth Store | PostgreSQL (via Neon / pg pool) |
| URL & Analytics Store | MongoDB (via Mongoose) |
| Cache & Rate Limiter | Redis 7 |
| Containerization | Docker + Docker Compose |
| Auth | JWT (JSON Web Tokens) |
| Password Hashing | bcrypt |

---

## 🏗️ Architecture Overview

```
Client
  │
  ▼
Express API (TypeScript)
  │
  ├─── Auth Routes (/user)
  │       └─── PostgreSQL  ← user registration & login
  │
  └─── URL Routes (/api)
          │
          ├─── Redis Cache ← cache-aside on redirect (24h TTL)
          │       └─── Click counter (INCR)  ← async, non-blocking
          │
          └─── MongoDB ← source of truth for URLs & click counts
                  ▲
                  │
          [Background Job]
          syncPendingClicks()  ← runs every 30s, drains Redis counters into MongoDB
```

### Why Polyglot Persistence?

- **PostgreSQL** is used for user data — relational, strongly consistent, with unique constraints enforced at the DB level.
- **MongoDB** is used for URL documents — flexible schema, fast document lookups by `shortCode`, and easy `$inc` updates for click analytics.
- **Redis** sits in front of MongoDB on the redirect path, serving cached URL lookups in sub-millisecond time and batching click increments to avoid write amplification.

---

## ⚡ Key Design Decisions

### 1. Cache-Aside Redirect Strategy
On every redirect (`GET /api/get/:shortCode`):
1. Check Redis first (`url:<shortCode>`).
2. On **cache HIT** → redirect immediately, increment `clicks:<shortCode>` in Redis.
3. On **cache MISS** → query MongoDB, backfill the cache with a 24-hour TTL, then redirect.

This means MongoDB is never touched on the hot path once a URL is warmed in cache.

### 2. Async Click Sync (Write Batching)
Click counts are **not** written to MongoDB on every redirect. Instead:
- Redis atomically increments `clicks:<shortCode>` and adds the code to a `pending:clicks` set.
- A `setInterval` job runs every **30 seconds**, iterates the pending set, and bulk-flushes counts into MongoDB via `$inc`.
- This decouples analytics durability from redirect latency.

### 3. Redis-Based IP Rate Limiting
The redirect endpoint is protected by a custom sliding-window rate limiter:
- **1000 requests per IP per 60-second window**.
- Implemented using Redis `INCR` + `EXPIRE` — no external middleware dependency.

### 4. Multi-Stage Docker Build
The Dockerfile uses a **builder → runner** pattern:
- Stage 1 compiles TypeScript and copies SQL migration files into `dist/`.
- Stage 2 installs only production dependencies and runs as a **non-root `node` user** for security hardening.

---

## 📁 Project Structure

```
src/
├── app.ts                    # Express app setup & route registration
├── server.ts                 # DB connections, background jobs, server start
├── config/
│   ├── mongodb.config.ts     # Mongoose connection
│   ├── pg.config.ts          # PostgreSQL pool (Neon)
│   └── redis.ts              # Redis client
├── controllers/
│   ├── url.controller.ts     # Create, redirect, delete, list URLs
│   └── user.controller.ts    # Register & login
├── db/
│   ├── migrate.ts            # Migration runner
│   └── migrations/
│       └── 001_create_users.sql
├── middlewares/
│   ├── auth.middleware.ts    # JWT verification
│   └── rateLimit.middleware.ts  # Redis-backed IP rate limiter
├── models/
│   └── url.model.ts          # Mongoose URL schema
├── routes/
│   ├── url.route.ts
│   └── user.route.ts
├── services/
│   └── clickSync.service.ts  # Background click flush job
├── types/
│   └── user.types.ts
└── utils/
    └── genrateShortCode.utils.ts
```

---

## 🔌 API Reference

### Auth — `/user`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/user/register` | ❌ | Register a new user |
| `POST` | `/user/login` | ❌ | Login and receive a JWT |

#### `POST /user/register`
```json
// Request Body
{
  "username": "alex",
  "email": "alex@example.com",
  "password": "securepassword"
}

// 201 Response
{
  "message": "user registered successfully",
  "user": { "id": "uuid", "username": "alex", "email": "alex@example.com" },
  "token": "<jwt>"
}
```

#### `POST /user/login`
```json
// Request Body
{ "email": "alex@example.com", "password": "securepassword" }

// 200 Response
{
  "message": "loggin successful",
  "user": { "id": "uuid", "username": "alex", "email": "alex@example.com" },
  "token": "<jwt>"
}
```

---

### URLs — `/api`

All write/read-your-own endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/short` | ✅ | Shorten a URL |
| `GET` | `/api/get/:shortCode` | ❌ | Redirect to original URL |
| `DELETE` | `/api/delete/:shortCode` | ✅ | Delete a short URL |
| `GET` | `/api/mylynks` | ✅ | List all URLs for logged-in user |

#### `POST /api/short`
```json
// Request Body
{ "originalUrl": "https://some-very-long-url.com/path?query=value" }

// 201 Response
{ "message": "aB3xYz generated" }
```

#### `GET /api/get/:shortCode`
- Returns `302 Redirect` to the original URL.
- Rate limited: **1000 req / 60s per IP**.

#### `GET /api/mylynks`
```json
// 200 Response
{
  "result": [
    { "originalUrl": "https://...", "shortCode": "aB3xYz", "clicks": 42 }
  ]
}
```


---

## 🧪 Quick Start — Try Lynk with cURL

Lynk does not currently include a frontend. You can interact with the API directly using
`curl`, Postman, or any HTTP client.

The examples below assume the API is running at:

```text
http://localhost:3000
```

### 1. Start Lynk

Using Docker:

```bash
git clone https:github.com/aniketxsaini/lynk
cd backend

cp .env.example .env
# Fill in the required environment variables in .env

docker compose up --build
```

The API should now be available at `http://localhost:3000`.

You can verify that the server is running:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok health check"
}
```

---

### 2. Register a User

Create a user account before using the authenticated URL endpoints.

```bash
curl -X POST http://localhost:3000/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo_user",
    "email": "demo@example.com",
    "password": "securepassword123"
  }'
```

Expected response:

```json
{
  "message": "user registered successfully",
  "user": {
    "id": "uuid",
    "username": "demo_user",
    "email": "demo@example.com"
  },
  "token": "<jwt>"
}
```

> Save the returned JWT. The token is required for the authenticated URL endpoints.

For convenience, set it as an environment variable:

```bash
TOKEN="<jwt>"
```

---

### 3. Login

If the user already exists, you can obtain a fresh JWT with:

```bash
curl -X POST http://localhost:3000/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "securepassword123"
  }'
```

Expected response:

```json
{
  "message": "loggin successful",
  "user": {
    "id": "uuid",
    "username": "demo_user",
    "email": "demo@example.com"
  },
  "token": "<jwt>"
}
```

Then:

```bash
TOKEN="<jwt>"
```

---

### 4. Create a Short URL

Create a short URL using the JWT from registration or login:

```bash
curl -X POST http://localhost:3000/api/short \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "originalUrl": "https://github.com/alexxsaini"
  }'
```

Expected response:

```json
{
  "message": "aB3xYz generated"
}
```

The generated value (`aB3xYz` in the example) is the `shortCode`.

> Replace `aB3xYz` in the commands below with the actual short code returned by your API.

---

### 5. Resolve / Redirect a Short URL

The redirect endpoint does **not** require authentication.

```bash
curl -i http://localhost:3000/api/get/aB3xYz
```

You should receive an HTTP redirect:

```text
HTTP/1.1 302 Found
Location: https://github.com/alexxsaini
```

To prevent `curl` from following the redirect automatically, use:

```bash
curl -I http://localhost:3000/api/get/aB3xYz
```

This endpoint is the latency-sensitive path where Lynk uses Redis as its cache.

It is also protected by the Redis-backed rate limiter:

```text
1000 requests / 60 seconds / IP
```

---

### 6. List Your Lynks

Retrieve the URLs belonging to the authenticated user:

```bash
curl http://localhost:3000/api/mylynks \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:

```json
{
  "result": [
    {
      "originalUrl": "https://github.com/alexxsaini",
      "shortCode": "aB3xYz",
      "clicks": 42
    }
  ]
}
```

The `clicks` value is updated asynchronously. Lynk increments click counters in Redis
during redirects and periodically flushes the pending counts into MongoDB.

---

### 7. Delete a Short URL

Delete a URL belonging to the authenticated user:

```bash
curl -X DELETE http://localhost:3000/api/delete/aB3xYz \
  -H "Authorization: Bearer $TOKEN"
```

Replace `aB3xYz` with the actual short code you created.

---

## 🔄 Complete cURL Workflow

If you just want to test Lynk from start to finish:

```bash
# 1. Register
curl -X POST http://localhost:3000/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo_user",
    "email": "demo@example.com",
    "password": "securepassword123"
  }'

# 2. Set the JWT returned by the previous request
TOKEN="<jwt>"

# 3. Create a short URL
curl -X POST http://localhost:3000/api/short \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "originalUrl": "https://github.com/alexxsaini"
  }'

# 4. Resolve it
curl -I http://localhost:3000/api/get/<shortCode>

# 5. View your Lynks
curl http://localhost:3000/api/mylynks \
  -H "Authorization: Bearer $TOKEN"

# 6. Delete it
curl -X DELETE http://localhost:3000/api/delete/<shortCode> \
  -H "Authorization: Bearer $TOKEN"
```

### Endpoint Summary

| Method | Endpoint | Auth | Try it |
|---|---|---|---|
| `GET` | `/health` | ❌ | Check API status |
| `POST` | `/user/register` | ❌ | Create an account |
| `POST` | `/user/login` | ❌ | Get a JWT |
| `POST` | `/api/short` | ✅ | Create a short URL |
| `GET` | `/api/get/:shortCode` | ❌ | Redirect to original URL |
| `GET` | `/api/mylynks` | ✅ | List your URLs |
| `DELETE` | `/api/delete/:shortCode` | ✅ | Delete a URL |


---

## 🗄️ Data Models

### PostgreSQL — `users` table
```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    username      VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### MongoDB — `urls` collection (Mongoose)
```
{
  originalUrl : String   (required)
  shortCode   : String   (required, unique)
  userId      : String   (required)
  clicks      : Number   (default: 0)
  createdAt   : Date     (auto)
  updatedAt   : Date     (auto)
}
```

---

## 🐳 Running with Docker (Recommended)

Spins up the API + Redis in a single command. You supply your own PostgreSQL (Neon) and MongoDB (Atlas) connection strings via `.env`.

```bash
# 1. Clone and enter the repo
git clone <your-repo-url>
cd backend

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Start services
docker compose up --build
```

> The API will be available at `http://localhost:3000`.
> Redis data is persisted via a named Docker volume (`redis_data`).

---

## 🛠️ Running Locally (Without Docker)

**Prerequisites:** Node.js 20+, a running Redis instance, PostgreSQL database, MongoDB database.

```bash
# Install dependencies
npm install

# Copy env file and set your connection strings
cp .env.example .env

# Run database migrations (creates users table in PostgreSQL)
npm run migrate

# Start development server
npm run dev
```

---

## ⚙️ Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: `3000`) |
| `NEON_URL` | PostgreSQL connection string |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SEC_KEY` | Secret key for signing JWTs |
| `REDIS_URL` | Redis connection URL |

See [`.env.example`](./.env.example) for the full template.

---

## 📄 License

MIT
