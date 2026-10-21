# METRIK DELTA

Formula 1 telemetry and season statistics — [metrikdelta.com](https://metrikdelta.com)

- **Telemetry** (`/app`): every lap of a session since 2018 on a lap-time chart, and up to 10 laps compared side by side — speed, throttle, brake, gear, RPM, time delta, track dominance and speed through each corner. Charts export as 3600 px images.
- **Statistics** (`/stats`): two drivers' season head to head (races, qualifying, sprints), with the driver and constructor standings, since 2003.
- **PRO** (Stripe subscription): the current season, and chart export.

## How it works

```
frontend/   React 19 + TypeScript + Vite, Recharts, Tailwind — deployed on Vercel
backend/    FastAPI (Python 3.14) — deployed on Railway, with PostgreSQL and Redis
video/      Remotion — vertical videos for social media, in the site's design
```

The backend serves four kinds of data:

| Data | Source |
| --- | --- |
| Past seasons' laps and telemetry | [FastF1](https://github.com/theOehrly/Fast-F1) |
| Current season | [OpenF1](https://openf1.org), read live |
| Results and standings | [Jolpica](https://github.com/jolpica/jolpica-f1) (Ergast API) |
| Ingested sessions | PostgreSQL, filled by an hourly job (`jobs/schedule_ingest.py`) |

Responses are cached in Redis. Accounts and subscriptions live in Supabase.

Past seasons are free; the current one is PRO, checked by the API itself (`app/access.py`): its laps, telemetry and season bundle need a signed-in subscriber's Supabase token, or the `X-Admin-Secret` header for our own tools.

OpenF1 streams car data and positions for the whole session, about four samples a second: a lap is cut from line to line and its distance integrated from its speed, counted from the line (`app/lap_samples.py`). Laps compared from the same event are then lined up by their positions on the reference lap's path (`aligned_distance` in `app/telemetry.py`), so a lap start time a tenth out doesn't move every braking point.

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

## Videos

Vertical videos (1080×1920, 60 fps, 60–120 s) from the live API, in English and French: a telemetry analysis of two laps. The site's own telemetry page replays the lap under a virtual camera, zooms onto the corners where the time goes, and points at what the charts show there — braking, apex speed and gear, throttle, exit speed (`video/src/duel/analysis.ts`). It is cut like a presenter's show: the mascot says the hook and the verdict to camera, the page is shown as a card over a blurred copy of itself under a two-line label, the subtitles are plain, and the first frame doubles as the cover (series, title, signature).

```bash
cd video
npm install
npm run render -- duel --year 2025 --gp 1 --session Q --drivers NOR,PIA   # out/duel-…-en.mp4 and -fr.mp4
npm run studio                                                           # live preview
```

`--laps 19,17` compares specific laps instead of the fastest ones; `--lang fr` renders one language only. The current season needs the API's admin secret in `METRIK_ADMIN_SECRET`.

A Grand Prix recap (60–80 s) tells a race from its classification and the top ten's laps (`video/src/recap/`): the podium, the gap to the leader lap by lap with the neutralised laps, the tyre stints, the top two's pace on the site's own lap chart (`LapTimesChart`, shared with the session explorer), the biggest climbs and the retirements, then what the race changes in the championship. Scenes cut under a sweeping band, the camera follows the charts and dives onto what the voice names, and the voice plays 12 % faster than recorded (`VOICE_PACE`). The race's data is fetched once into `video/out/cache/`.

```bash
npm run render -- recap --year 2026 --gp 17 --lang fr   # out/2026-marinabay-recap-fr.mp4
```

A qualifying recap (`video/src/quali/`) shows the top ten as a starting grid, tells the pole lap against the runner-up's on the site's telemetry page corner by corner (the duel's `PageTimeline`: braking points, speeds, gears, throttle and the delta), then the quickest in each sector with the lap someone's best sectors add up to, and the teammates' gaps.

```bash
npm run render -- quali --year 2026 --gp 17 --lang fr   # out/2026-marinabay-quali-fr.mp4
```

Telemetry whose distances disagree with its lap time is scaled back to the lap's length before anything is measured (`withLapLength`): some of the API's 2026 laps come with distances about ten times too long.

**Voiceover.** What the voice says comes from `video/narration/<video>.<lang>.json` when a script has been written for that video, or is generated from the analysis. The render speaks it with [Chatterbox](https://huggingface.co/mlx-community/chatterbox-multilingual-v3) on Apple Silicon, times the video to it and writes the script as `.srt` next to the video (`--silent` skips the voice). One-time setup:

```bash
brew install uv
mkdir -p ~/chatterbox && cd ~/chatterbox
uv venv --python 3.12 && uv pip install --python .venv/bin/python mlx-audio
mkdir voices   # ref-fr.wav and ref-en.wav: 10 s of the voice to clone, 24 kHz mono
```

`CHATTERBOX_PYTHON`, `VOICE_FR` and `VOICE_EN` point elsewhere if needed. Spoken lines are kept in `video/public/voice/` until their text, the voice or the settings (`video/tts/settings.json`) change.

The voice studio (`uv pip install --python ~/chatterbox/.venv/bin/python gradio` once, then `~/chatterbox/.venv/bin/python tts/studio.py` from `video/`) plays each video's lines, tries any line with any voice and settings, and records or picks the voice and settings the videos use.

**Mascot.** A race-engineer donkey drawn in code (`video/src/mascot/`) says the lines to camera. Its mouth follows the voice through [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync), which the render runs on each spoken line when it is installed (Rosetta on Apple Silicon):

```bash
mkdir -p ~/rhubarb && cd ~/rhubarb
curl -L -o rhubarb.zip https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.14.0/Rhubarb-Lip-Sync-1.14.0-macOS.zip
unzip rhubarb.zip && mv Rhubarb-Lip-Sync-1.14.0-macOS app && rm rhubarb.zip
```

`RHUBARB` points elsewhere if needed. Its expression follows tags in the script: `[focused]`, `[surprised]`, `[ironic]`, `[disappointed]`, `[pleased]` change its face from the next word, and are not said. `npm run still -- --id MascotSheet` renders its model sheet; the `MascotLine-fr` / `MascotLine-en` compositions show it saying a video's hook (`npx remotion render MascotLine-fr out/mascot-line-fr.mp4`, once the video has been rendered with its voice).

## Checks

```bash
cd frontend && npm test && npm run lint && npx tsc -b
cd backend && pytest
cd video && npm test && npm run typecheck
```

---

Data from FastF1, OpenF1 and Jolpica. METRIK DELTA is not affiliated with Formula 1.
