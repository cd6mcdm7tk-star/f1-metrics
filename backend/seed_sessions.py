"""
Seed script — run LOCALLY (not on Railway).
Fetches all OpenF1 session_keys for 2025-2026 and inserts them into Railway PostgreSQL.

Usage:
  DATABASE_URL=<railway_postgresql_url> python seed_sessions.py
"""
import os
import sys
from collections import defaultdict

import httpx
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ Set DATABASE_URL environment variable first")
    sys.exit(1)

SESSION_NAME_MAP = {
    "Practice 1":        "FP1",
    "Practice 2":        "FP2",
    "Practice 3":        "FP3",
    "Qualifying":        "Q",
    "Sprint Qualifying": "SQ",
    "Sprint":            "S",
    "Race":              "R",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://openf1.org/",
    "Origin": "https://openf1.org",
}

def fetch_sessions(year: int) -> list:
    url = f"https://api.openf1.org/v1/sessions?year={year}"
    print(f"  → GET {url}")
    resp = httpx.get(url, timeout=30, headers=HEADERS)
    resp.raise_for_status()
    return resp.json()

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS session_keys (
            year         INT         NOT NULL,
            gp_round     INT         NOT NULL,
            session_type VARCHAR(10) NOT NULL,
            session_key  INT         NOT NULL,
            created_at   TIMESTAMP   DEFAULT NOW(),
            PRIMARY KEY (year, gp_round, session_type)
        )
    """)
    conn.commit()

    total = 0
    for year in [2025, 2026]:
        print(f"\n📅 {year}")
        try:
            sessions = fetch_sessions(year)
        except Exception as e:
            print(f"  ⚠️  Skipping {year}: {e}")
            continue

        # Filter pre-season tests, sort by date
        race_sessions = sorted(
            [s for s in sessions if "test" not in s.get("meeting_name", "").lower()],
            key=lambda s: s.get("date_start", ""),
        )

        # Group by session_type, assign round number (1, 2, 3...) within each group
        by_type: dict[str, list] = defaultdict(list)
        for s in race_sessions:
            stype = SESSION_NAME_MAP.get(s.get("session_name", ""))
            if stype:
                by_type[stype].append(s)

        for session_type, typed_sessions in by_type.items():
            for gp_round, s in enumerate(typed_sessions, start=1):
                cur.execute("""
                    INSERT INTO session_keys (year, gp_round, session_type, session_key)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (year, gp_round, session_type) DO UPDATE
                        SET session_key = EXCLUDED.session_key
                """, (year, gp_round, session_type, s["session_key"]))
                print(f"  ✅ round {gp_round:2d} {session_type:3s} → {s['session_key']}  ({s.get('meeting_name', '')})")
                total += 1

        conn.commit()

    cur.close()
    conn.close()
    print(f"\n✅ {total} session_keys insérés dans PostgreSQL")

if __name__ == "__main__":
    main()
