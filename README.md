# METRIK DELTA

Formula 1 telemetry and season statistics — [metrikdelta.com](https://metrikdelta.com)

- **Telemetry** (`/app`): every lap of a session since 2018 on a lap-time chart, and up to 10 laps compared side by side — speed, throttle, brake, gear, RPM, time delta, track dominance and speed through each corner. Charts export as 3600 px images.
- **Statistics** (`/stats`): two drivers' season head to head (races, qualifying, sprints), with the driver and constructor standings, since 2003.
- **PRO** (Stripe subscription): the current season, and chart export.

## How it works

```
frontend/   React 19 + TypeScript + Vite, Recharts, Tailwind — deployed on Vercel
backend/    FastAPI (Python 3.14) — deployed on Railway, with PostgreSQL and Redis
```

The backend serves four kinds of data:

| Data | Source |
| --- | --- |
| Past seasons' laps and telemetry | [FastF1](https://github.com/theOehrly/Fast-F1) |
| Current season | [OpenF1](https://openf1.org), read live |
| Results and standings | [Jolpica](https://github.com/jolpica/jolpica-f1) (Ergast API) |
| Ingested sessions | PostgreSQL, filled by an hourly job (`jobs/schedule_ingest.py`) |

Responses are cached in Redis. Accounts and subscriptions live in Supabase.

```
backend/
  main.py              app setup
  database.py          PostgreSQL pool and queries
  app/
    routes/            HTTP routes: sessions, telemetry, laps, season, payments, admin
    openf1.py          OpenF1 client
    telemetry.py       lap telemetry from PostgreSQL, OpenF1 or FastF1
    season.py          season bundle from Jolpica
  jobs/                session ingestion (cron)
frontend/src/
  pages/               Landing, Telemetry, Statistics, checkout results
  components/          charts, explorer, modals; stats/ for the Statistics cards
  stats/               season computations (head to head, standings)
  services/, utils/    API client, colours, chart export
```

## Running it locally

Backend — needs a `.env` with `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`, `STRIPE_WEBHOOK_SECRET`. `DATABASE_URL`, `REDIS_URL`, `OPENF1_EMAIL` / `OPENF1_PASSWORD` and `ADMIN_SECRET` are optional: without them it reads live data and caches in memory.

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements-dev.txt
uvicorn main:app --reload --port 8000
```

Frontend — needs a `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (it calls `http://localhost:8000` in development).

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Ingesting a session by hand: `python jobs/ingest_session.py --year 2026 --round 1 --session Q`.

## Checks

```bash
cd frontend && npm test && npm run lint && npx tsc -b
cd backend && pytest
```

---

Data from FastF1, OpenF1 and Jolpica. METRIK DELTA is not affiliated with Formula 1.
