# Lynk Performance Benchmark

## Overview

Lynk is a URL shortener with MongoDB as persistent storage and Redis as
the caching layer for the latency-sensitive redirect path.

This benchmark compares the complete HTTP redirect endpoint with:

-   Redis caching disabled → MongoDB-backed lookup
-   Redis caching enabled and warmed → Redis-backed lookup

The benchmark measures the application request path rather than isolated
database operations.

------------------------------------------------------------------------

## Benchmark Environment

  Component            Configuration
  -------------------- --------------------------------
  Backend              Node.js + Express + TypeScript
  Database             MongoDB 7
  Cache                Redis 7
  Infrastructure       Docker Compose
  Load testing         k6
  Dataset              500 seeded short URLs
  Test duration        60 seconds
  Concurrency          100 and 200 VUs
  Expected response    HTTP 302
  Redirect following   Disabled
  Rate limiting        Disabled

MongoDB, Redis, and the Lynk backend run inside Docker. k6 runs on the
host machine.

------------------------------------------------------------------------

## Workload

The benchmark repeatedly calls:

``` text
GET /api/get/:shortCode
```

A random short code is selected from the fixed 500-code dataset for
every iteration.

The k6 request disables redirect following:

``` javascript
http.get(`http://localhost:3000/api/get/${code}`, {
  redirects: 0,
});
```

This ensures that the benchmark measures Lynk's redirect endpoint rather
than making additional requests to the destination URL.

Every successful request is expected to return:

``` text
HTTP 302
```

------------------------------------------------------------------------

## Request Paths

### MongoDB

With caching disabled:

``` text
Client
  ↓
Lynk API
  ↓
MongoDB findOne()
  ↓
HTTP 302
```

### Redis

With caching enabled and the benchmark cache warmed:

``` text
Client
  ↓
Lynk API
  ↓
Redis GET
  ↓
Redis click update
  ↓
HTTP 302
```

The Redis measurement therefore includes the Redis work performed by the
actual redirect implementation, not just a standalone Redis GET.

------------------------------------------------------------------------

# Methodology

The benchmark uses k6's `constant-vus` executor.

Example:

``` javascript
export const options = {
  scenarios: {
    redirect_test: {
      executor: "constant-vus",
      vus: 200,
      duration: "60s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<100"],
  },
};
```

The same workload and dataset are used for MongoDB and Redis.

Before Redis testing, the benchmark URLs are warmed into Redis.

The test validates that the endpoint returns HTTP 302.

------------------------------------------------------------------------
## 🚀 Benchmark Result

| Workload | MongoDB | Redis | Redis Advantage |
|---|---:|---:|---:|
| **100 VUs / 60s — Throughput** | 2,297.55 req/s | **5,707.15 req/s** | **2.48×** |
| **200 VUs / 60s — Throughput** | 2,333.59 req/s | **5,686.70 req/s** | **2.44×** |
| **100 VUs — Avg Latency** | 43.42 ms | **17.43 ms** | **59.8% lower** |
| **200 VUs — Avg Latency** | 85.58 ms | **35.07 ms** | **59.0% lower** |
| **100 VUs — P95** | 55.70 ms | **22.12 ms** | **60.3% lower** |
| **200 VUs — P95** | 98.72 ms | **41.60 ms** | **57.9% lower** |
| **HTTP failures** | 0% | 0% | **0%** |

**Bottom line:** Redis sustained roughly **2.4–2.5× the throughput** of the MongoDB-backed redirect path while reducing average and P95 latency by roughly **58–60%**. All four final runs recorded **0% HTTP failures**.

---

# 📊 Full Performance Matrix

| VUs | Backend | Requests | Req/s | Avg | P50 | P90 | P95 | Max | Errors |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 100 | MongoDB | 137,915 | 2,297.55 | 43.42 ms | 41.91 ms | 48.81 ms | 55.70 ms | 858.37 ms | 0% |
| 100 | **Redis** | **342,493** | **5,707.15** | **17.43 ms** | **16.88 ms** | **20.29 ms** | **22.12 ms** | **433.18 ms** | **0%** |
| 200 | MongoDB | 140,096 | 2,333.59 | 85.58 ms | 83.11 ms | 92.40 ms | 98.72 ms | 1.66 s | 0% |
| 200 | **Redis** | **341,319** | **5,686.70** | **35.07 ms** | **34.12 ms** | **38.75 ms** | **41.60 ms** | **991.38 ms** | **0%** |

---

# ⚡ MongoDB vs Redis — Improvement Matrix

| Metric | 100 VUs | 200 VUs |
|---|---:|---:|
| **Throughput multiplier** | **2.48×** | **2.44×** |
| **Throughput improvement** | **+148.4%** | **+143.7%** |
| **Average latency reduction** | **59.8%** | **59.0%** |
| **P50 reduction** | **59.7%** | **59.0%** |
| **P90 reduction** | **58.4%** | **58.0%** |
| **P95 reduction** | **60.3%** | **57.9%** |
| **Maximum latency reduction** | **49.5%** | **40.3%** |

---

# 📈 Scaling Behavior

The most important observation is what happens when concurrency doubles from **100 → 200 VUs**.

| Backend | 100 VUs | 200 VUs | Throughput Change | Avg Latency Change |
|---|---:|---:|---:|---:|
| **MongoDB** | 2,297.55 req/s | 2,333.59 req/s | **+1.6%** | **+97.1%** |
| **Redis** | 5,707.15 req/s | 5,686.70 req/s | **−0.36%** | **+101.2%** |

### Interpretation

**MongoDB**

- Throughput effectively plateaus around **~2.3k req/s**.
- Doubling VUs produces only ~1.6% additional throughput.
- Average latency nearly doubles.
- P95 rises from **55.70 ms → 98.72 ms**.

**Redis**

- Throughput remains around **~5.7k req/s**.
- Doubling VUs produces essentially no additional throughput, indicating a plateau in this environment.
- However, the plateau occurs at roughly **2.4× the MongoDB throughput**.
- P95 remains substantially lower than MongoDB.

---

# 🎯 100 VUs — Detailed Comparison

| Metric | MongoDB | Redis | Redis Improvement |
|---|---:|---:|---:|
| Requests | 137,915 | **342,493** | **+148.4% throughput** |
| Throughput | 2,297.55 req/s | **5,707.15 req/s** | **2.48×** |
| Average | 43.42 ms | **17.43 ms** | **59.8% lower** |
| P50 | 41.91 ms | **16.88 ms** | **59.7% lower** |
| P90 | 48.81 ms | **20.29 ms** | **58.4% lower** |
| P95 | 55.70 ms | **22.12 ms** | **60.3% lower** |
| Maximum | 858.37 ms | **433.18 ms** | **49.5% lower** |
| HTTP failures | 0% | 0% | — |

---

# 🎯 200 VUs — Detailed Comparison

| Metric | MongoDB | Redis | Redis Improvement |
|---|---:|---:|---:|
| Requests | 140,096 | **341,319** | **+143.7% throughput** |
| Throughput | 2,333.59 req/s | **5,686.70 req/s** | **2.44×** |
| Average | 85.58 ms | **35.07 ms** | **59.0% lower** |
| P50 | 83.11 ms | **34.12 ms** | **59.0% lower** |
| P90 | 92.40 ms | **38.75 ms** | **58.0% lower** |
| P95 | 98.72 ms | **41.60 ms** | **57.9% lower** |
| Maximum | 1.66 s | **991.38 ms** | **40.3% lower** |
| HTTP failures | 0% | 0% | — |

---

# 🧠 Architecture Under Test

Lynk keeps MongoDB as the persistent source of truth and uses Redis for the latency-sensitive redirect path.

```text
                         ┌───────────────┐
                         │    Client     │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │    Lynk API   │
                         │ Node/Express  │
                         └───────┬───────┘
                                 │
                       ┌─────────┴─────────┐
                       │                   │
                 Redis enabled       Cache disabled
                       │                   │
                       ▼                   ▼
                ┌─────────────┐     ┌─────────────┐
                │    Redis    │     │   MongoDB   │
                │ URL Cache   │     │   Lookup    │
                └──────┬──────┘     └──────┬──────┘
                       │                   │
                       └─────────┬─────────┘
                                 ▼
                           HTTP 302
```

### Redis hit path

```text
shortCode
    ↓
Redis GET
    ↓
click update
    ↓
HTTP 302
```

### MongoDB path

```text
shortCode
    ↓
MongoDB findOne()
    ↓
HTTP 302
```

---

# 🔬 What Exactly Was Measured?

The benchmark measures the complete HTTP request path:

```text
k6
 ↓
HTTP request
 ↓
Lynk /api/get/:shortCode
 ↓
URL resolution
 ↓
HTTP 302
```

It is **not** a microbenchmark of `Redis GET` versus `MongoDB findOne()`.

The measurement includes application, HTTP, serialization, container-networking, and datastore overhead involved in serving the request.

The Redis path also includes the Redis operations associated with click tracking.

---

# 🧪 Benchmark Methodology

## Dataset

- **500 pre-seeded short URLs**
- Same dataset for MongoDB and Redis
- Random short code selected for every iteration

## Load profile

```text
100 VUs × 60 seconds
200 VUs × 60 seconds
```

## Redirect behavior

k6 does **not** follow the HTTP 302, preventing the external destination from contaminating the measurement.

Expected response:

```text
302 Found
```

## Validation

Each request checks:

```text
status == 302
```

The benchmark also tracks:

```text
http_req_duration
http_req_failed
```

A `p(95)<100ms` threshold is configured as a performance guardrail.

---

# 🛠️ Reproducing the Benchmark

Start infrastructure:

```bash
docker compose up -d --build
```

Seed benchmark data:

```bash
docker compose exec api npm run bench:seed
```

### MongoDB benchmark

Set:

```env
DISABLE_CACHE=true
```

Then:

```bash
k6 run scripts/k6-benchmark.js
```

### Redis benchmark

Set:

```env
DISABLE_CACHE=false
```

Warm Redis:

```bash
docker compose exec api npm run bench:warm
```

Then:

```bash
k6 run scripts/k6-benchmark.js
```

### Cache and data utilities

```bash
docker compose exec api npm run bench:clear
docker compose exec api npm run bench:cleanup
```

---

# 🖥️ Infrastructure

```text
┌──────────────────────────────────────────────────┐
│                  Host Machine                    │
│                                                  │
│  ┌─────────────┐                                 │
│  │     k6      │                                 │
│  │ Load Tester │                                 │
│  └──────┬──────┘                                 │
│         │ HTTP                                    │
│         ▼                                         │
│  ┌────────────────────────────────────────────┐  │
│  │              Docker Network                │  │
│  │                                            │  │
│  │  ┌─────────────┐                           │  │
│  │  │ Lynk API   │                           │  │
│  │  └──────┬──────┘                           │  │
│  │         │                                  │  │
│  │    ┌────┴─────┐                            │  │
│  │    ▼          ▼                            │  │
│  │ ┌───────┐  ┌─────────┐                    │  │
│  │ │ Redis │  │ MongoDB │                    │  │
│  │ └───────┘  └─────────┘                    │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

# ⚠️ Benchmark Limitations

These numbers describe the tested local environment and are **not a claim of production capacity**.

- Backend, MongoDB, and Redis run locally in Docker.
- k6 runs on the host machine.
- The benchmark uses 500 URLs.
- The final dataset covers 100 and 200 VUs.
- The benchmark measures the complete HTTP endpoint, not isolated datastore latency.
- CPU, memory, event-loop utilization, MongoDB resource usage, and Redis resource usage were not captured in these final runs.
- Production infrastructure will have different networking and resource characteristics.

The benchmark establishes **observed performance and scaling behavior**, but does not by itself identify the exact component responsible for the throughput ceiling.

---

# 💡 Engineering Findings

### 1. Redis significantly improves the hot path

At both tested concurrency levels, Redis delivers approximately **2.4–2.5× the throughput** of the MongoDB-backed path.

### 2. Latency improvement is consistent

Average and P95 latency improvements remain around **58–60%** across both workloads.

### 3. MongoDB approaches a throughput plateau

```text
100 VUs → 2,297.55 req/s
200 VUs → 2,333.59 req/s
```

Doubling concurrency produces only ~1.6% additional throughput while substantially increasing latency.

### 4. Redis reaches a higher throughput plateau

```text
100 VUs → 5,707.15 req/s
200 VUs → 5,686.70 req/s
```

The Redis path maintains approximately **5.7k req/s** across both concurrency levels.

### 5. More concurrency does not automatically create more throughput

Both paths show diminishing returns once their throughput ceiling is approached. Additional concurrency primarily increases latency.

---

# 📌 Recruiter-Friendly Summary

> **I benchmarked Lynk's URL redirect path under 100 and 200 concurrent virtual users using k6, with the backend, Redis, and MongoDB running in Docker. Using the same 500-URL workload, the Redis-backed path sustained ~5.7k req/s compared with ~2.3k req/s for MongoDB — approximately 2.4–2.5× higher throughput. Redis also reduced average and P95 latency by roughly 58–60%, while all four benchmark runs maintained 0% HTTP failures.**

### Demonstrated engineering areas

- Redis caching
- MongoDB
- Node.js / Express
- TypeScript
- Docker / Docker Compose
- k6 load testing
- Concurrent workload design
- Latency percentile analysis
- Throughput analysis
- Performance bottleneck identification
- Cache-backed system architecture

---

# 📋 Final Results at a Glance

| VUs | Backend | Throughput | Avg | P95 | Max | Errors |
|---:|---|---:|---:|---:|---:|---:|
| 100 | MongoDB | 2,297.55 req/s | 43.42 ms | 55.70 ms | 858 ms | 0% |
| 100 | **Redis** | **5,707.15 req/s** | **17.43 ms** | **22.12 ms** | **433 ms** | **0%** |
| 200 | MongoDB | 2,333.59 req/s | 85.58 ms | 98.72 ms | 1.66 s | 0% |
| 200 | **Redis** | **5,686.70 req/s** | **35.07 ms** | **41.60 ms** | **991 ms** | **0%** |

## Final Takeaway

**For Lynk's tested redirect workload, Redis provided a substantially faster and higher-throughput hot path than direct MongoDB lookup, while maintaining zero HTTP failures across the final 100-VU and 200-VU benchmark runs.**
