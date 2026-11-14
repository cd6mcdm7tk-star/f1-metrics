# METRIK DELTA

[![CI](https://github.com/cd6mcdm7tk-star/f1-metrics/actions/workflows/ci.yml/badge.svg)](https://github.com/cd6mcdm7tk-star/f1-metrics/actions/workflows/ci.yml) [![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

Formula 1 telemetry and season statistics — [metrikdelta.com](https://metrikdelta.com). Free, with no account, and open source.

- **Telemetry** (`/app`): every lap of a session since 2021 on a lap-time chart, and up to 10 laps compared side by side — speed, throttle, brake, gear, RPM, time delta, track dominance and speed through each corner. Charts export as 3600 px images.
- **Statistics** (`/stats`): two drivers' season head to head (races, qualifying, sprints), with the driver and constructor standings, since 2003.

## How it works

```
frontend/   React 19 + TypeScript + Vite, Recharts, Tailwind — deployed on Vercel
backend/    FastAPI (Python 3.12) — deployed on Railway, with PostgreSQL and Redis
video/      Remotion — vertical videos for social media, in the site's design
```

The backend serves four kinds of data:

| Data | Source |
| --- | --- |
| Laps and telemetry, 2023 onwards | [OpenF1](https://openf1.org) |
| Laps and telemetry, 2021–2022 | [FastF1](https://github.com/theOehrly/Fast-F1), from its mirror of F1's timing archive (the archive itself needs an F1 TV login since October 2026, so 2018–2020 can't be loaded) |
| Results and standings | [Jolpica](https://github.com/jolpica/jolpica-f1) (Ergast API) |
| Ingested sessions | PostgreSQL: every lap's time and each driver's fastest-lap telemetry, filled by an hourly job (`jobs/schedule_ingest.py`) and, for past seasons, `jobs/backfill_season.py` |

The home page's first card is the latest qualifying session's front row, found by `/api/latest-qualifying` (`app/featured.py`) once its results are final. Messages sent from the Feedback panel (`POST /api/feedback`, `app/routes/feedback.py`) are kept in PostgreSQL for twelve months and read through `GET /api/admin/feedback`. Responses are cached in Redis. Everything is public; only the admin routes (`/api/admin`: ingestion, feedback) need the `X-Admin-Secret` header.

OpenF1 streams car data and positions for the whole session, about four samples a second: a lap is cut from line to line and its distance integrated from its speed, counted from the line (`app/lap_samples.py`). Laps compared from the same event are then lined up by their positions on the reference lap's path (`aligned_distance` in `app/telemetry.py`), so a lap start time a tenth out doesn't move every braking point.

```
backend/
  main.py              app setup
  database.py          PostgreSQL pool and queries
  app/
    routes/            HTTP routes: sessions, telemetry, laps, season, admin
    openf1.py          OpenF1 client
    telemetry.py       lap telemetry from PostgreSQL, OpenF1 or FastF1
    season.py          season bundle from Jolpica
    featured.py        the home page's latest qualifying
  jobs/                session ingestion (cron)
frontend/src/
  pages/               Landing, Telemetry, Statistics, Methodology, Legal
  components/          charts, explorer; stats/ for the Statistics cards, methodology/ for the Methodology page's figures
  stats/               season computations (head to head, standings)
  services/, utils/    API client, colours, chart export
```

## Running it locally

Backend (Python 3.12 or later) — runs as is: without `DATABASE_URL` and `REDIS_URL` it reads live data and caches in memory. `OPENF1_EMAIL` / `OPENF1_PASSWORD` (an OpenF1 account, needed during live sessions) and `ADMIN_SECRET` (the ingestion routes) are optional, in a `.env` (see `backend/.env.example`).

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements-dev.txt
uvicorn main:app --reload --port 8000
```

Frontend — calls `http://localhost:8000` in development.

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

`--laps 19,17` compares specific laps instead of the fastest ones; `--lang fr` renders one language only.

A Grand Prix recap (60–80 s) tells a race from its classification and the top ten's laps (`video/src/recap/`): the podium, the gap to the leader lap by lap with the neutralised laps, the tyre stints, the top two's pace on the site's own lap chart (`LapTimesChart`, shared with the session explorer), the biggest climbs and the retirements, then what the race changes in the championship. Scenes cut under a sweeping band, the camera follows the charts and dives onto what the voice names, and the voice is mastered 12 % faster than recorded, at the loudness social feeds play at (`VOICE_PACE`, `video/tts/master.py`). The race's data is fetched once into `video/out/cache/`.

```bash
npm run render -- recap --year 2026 --gp 17 --lang fr   # out/2026-marinabay-recap-fr.mp4
```

A qualifying recap (`video/src/quali/`) shows the top ten as a starting grid, tells the pole lap against the runner-up's on the site's telemetry page corner by corner (the duel's `PageTimeline`: braking points, speeds, gears, throttle and the delta), then the quickest in each sector with the lap someone's best sectors add up to, and the teammates' gaps.

```bash
npm run render -- quali --year 2026 --gp 17 --lang fr   # out/2026-marinabay-quali-fr.mp4
```

The newer series are animations first, with the site as the proof (`video/src/kit/`): the circuit in 3D from the laps' positions under a perspective camera that can fly over it or ride behind a car (`Track3D`, `projection.ts`), the car's instruments, schematics drawn as the voice explains them, and the site's own charts as the proof. Each video is told beat by beat, one line of its script per beat (`kit/timeline.ts`).

- **La Bible F1** (`video/src/bible/`): one technical idea per episode, explained by animation, then proven on a real lap. Episode 1, the apex, on Austin 2025's pole lap.
- **Qualifying** (`video/src/pole/`): the top six as a starting grid, the pole lap against the runner-up's on the same clock, the corner it was won in, P3 to P6 one by one, the sectors and top speeds. The official order comes from OpenF1, as Jolpica publishes it hours later; a circuit the current season has no corner numbers for yet takes last year's, matched by position.

```bash
npm run render -- bible --episode corde --lang fr
npm run render -- pole --year 2026 --gp 18 --lang fr   # needs narration/2026-austin-pole.fr.json
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

`RHUBARB` points elsewhere if needed. Its expression follows tags in the script: `[focused]`, `[surprised]`, `[ironic]`, `[disappointed]`, `[pleased]` change its face from the next word, and are not said. `npm run still -- --id MascotSheet` renders its model sheet, `--id MascotAvatar` the social networks' profile picture and `--id ShareImage` the site's link preview (`frontend/public/og-image.png`, reduced to 256 colours); the `MascotLine-fr` / `MascotLine-en` compositions show it saying a video's hook (`npx remotion render MascotLine-fr out/mascot-line-fr.mp4`, once the video has been rendered with its voice).

## Checks

```bash
cd frontend && npm test && npm run lint && npx tsc -b
cd backend && pytest
cd video && npm test && npm run typecheck
```

They run on every push and pull request (`.github/workflows/ci.yml`).

## License

The code is free software under the [GNU Affero General Public License v3.0](LICENSE): you may use, study, modify and share it, and if you run a modified version as a service, you publish your changes under the same license. The license covers the code only: the METRIK DELTA name, logo, mascot and videos are not part of it.

Issues and pull requests are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Security problems are reported privately, as [SECURITY.md](SECURITY.md) explains.

---

Data from FastF1, OpenF1 and Jolpica. METRIK DELTA is an independent project, not affiliated with, endorsed by or sponsored by Formula 1.
