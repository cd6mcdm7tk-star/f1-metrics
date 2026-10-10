"""PostgreSQL: connection pool and queries for the ingested F1 data (laps, telemetry, session keys)."""
import json
import logging
import math
import os
from typing import Optional

import psycopg2
from psycopg2 import pool

logger = logging.getLogger(__name__)


def _clean_telemetry_data(telemetry_data):
    # psycopg2 returns JSONB as dict already
    if isinstance(telemetry_data, str):
        telemetry_data = json.loads(telemetry_data)
    # NaN/Inf aren't valid JSON: replaced by 0, in lists and scalars
    if telemetry_data:
        for key, value in telemetry_data.items():
            if isinstance(value, list):
                telemetry_data[key] = [
                    0.0 if isinstance(v, float) and (math.isnan(v) or math.isinf(v)) else v
                    for v in value
                ]
            elif isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                telemetry_data[key] = 0.0
    return telemetry_data


class PostgresDB:
    MIN_IDLE_CONNECTIONS = 4

    def __init__(self):
        self.pool: Optional[pool.ThreadedConnectionPool] = None
        self._connect()

    def _connect(self):
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            logger.warning("DATABASE_URL not set - PostgreSQL disabled, falling back to FastF1")
            return
        try:
            # The pool only keeps `minconn` idle connections and closes any
            # extra one handed back — so a burst of parallel requests above
            # that would each pay a brand-new connection (TCP + TLS + auth,
            # several round trips) instead of reusing a warm one.
            self.pool = pool.ThreadedConnectionPool(
                minconn=self.MIN_IDLE_CONNECTIONS,
                maxconn=10,
                dsn=database_url,
                # Keepalives stop idle pooled connections from being silently
                # dropped along the way, and detect it when they are anyway.
                keepalives=1,
                keepalives_idle=30,
                keepalives_interval=10,
                keepalives_count=3,
            )
            conn = self.pool.getconn()  # test the connection
            self.pool.putconn(conn)
            logger.info("PostgreSQL connected successfully")
        except Exception as e:
            logger.error(f"PostgreSQL connection failed: {e}")
            self.pool = None

    @property
    def available(self) -> bool:
        return self.pool is not None

    def _execute(self, query: str, params=None, fetch: Optional[str] = None):
        """
        Run a query inside a pooled connection.
        fetch: 'one' | 'all' | None (for writes)
        """
        if not self.pool:
            return None
        # Worst case every idle pooled connection is dead (e.g. after a
        # database restart): each one is discarded in turn until the pool
        # opens a fresh one.
        attempts = self.MIN_IDLE_CONNECTIONS + 1
        for attempt in range(attempts):
            conn = self.pool.getconn()
            broken = False
            try:
                # Autocommit: every query here is a single statement, so it's
                # atomic on its own — without it psycopg2 wraps each one in
                # BEGIN ... COMMIT, two extra round trips to the database.
                conn.autocommit = True
                with conn.cursor() as cur:
                    cur.execute(query, params)
                    if fetch == "one":
                        return cur.fetchone()
                    if fetch == "all":
                        return cur.fetchall()
                    return None
            except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
                # An idle pooled connection the server (or a proxy in between)
                # has since dropped — discard it and retry on another one.
                broken = True
                if attempt == attempts - 1:
                    logger.error(f"DB error: {e}")
                    raise
                logger.warning(f"DB connection lost, retrying: {e}")
            except Exception as e:
                logger.error(f"DB error: {e}")
                raise
            finally:
                self.pool.putconn(conn, close=broken)

    # ------------------------------------------------------------------
    # DDL
    # ------------------------------------------------------------------
    def create_tables(self):
        sql = """
        CREATE TABLE IF NOT EXISTS session_keys (
            year         INT          NOT NULL,
            gp_round     INT          NOT NULL,
            session_type VARCHAR(10)  NOT NULL,
            session_key  INT          NOT NULL,
            created_at   TIMESTAMP    DEFAULT NOW(),
            PRIMARY KEY (year, gp_round, session_type)
        );

        CREATE TABLE IF NOT EXISTS telemetry (
            id SERIAL PRIMARY KEY,
            year INT NOT NULL,
            gp_round INT NOT NULL,
            session_type VARCHAR(10) NOT NULL,
            driver_code VARCHAR(3) NOT NULL,
            lap_number INT NOT NULL,
            lap_type VARCHAR(20) NOT NULL,
            telemetry_data JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE (year, gp_round, session_type, driver_code, lap_type)
        );

        CREATE TABLE IF NOT EXISTS laps (
            id SERIAL PRIMARY KEY,
            year INT NOT NULL,
            gp_round INT NOT NULL,
            session_type VARCHAR(10) NOT NULL,
            driver_code VARCHAR(3) NOT NULL,
            lap_number INT NOT NULL,
            lap_time FLOAT,
            sector1_time FLOAT,
            sector2_time FLOAT,
            sector3_time FLOAT,
            compound VARCHAR(20),
            is_personal_best BOOLEAN DEFAULT FALSE,
            telemetry_available BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE (year, gp_round, session_type, driver_code, lap_number)
        );

        CREATE INDEX IF NOT EXISTS idx_telemetry_lookup
            ON telemetry (year, gp_round, session_type, driver_code, lap_type);
        CREATE INDEX IF NOT EXISTS idx_laps_lookup
            ON laps (year, gp_round, session_type, driver_code);
        """
        self._execute(sql)
        logger.info("Tables created / verified")

    # ------------------------------------------------------------------
    # Session keys
    # ------------------------------------------------------------------
    def get_session_key(self, year: int, gp_round: int, session_type: str) -> Optional[int]:
        row = self._execute(
            "SELECT session_key FROM session_keys WHERE year=%s AND gp_round=%s AND session_type=%s",
            (year, gp_round, session_type),
            fetch="one",
        )
        return row[0] if row else None

    def save_session_key(self, year: int, gp_round: int, session_type: str, session_key: int):
        self._execute(
            """
            INSERT INTO session_keys (year, gp_round, session_type, session_key)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (year, gp_round, session_type) DO UPDATE
                SET session_key = EXCLUDED.session_key
            """,
            (year, gp_round, session_type, session_key),
        )

    # ------------------------------------------------------------------
    # Telemetry
    # ------------------------------------------------------------------
    def get_telemetry_with_metadata(self, refs: list[tuple]) -> dict[tuple, dict]:
        """
        Several laps' telemetry and lap-time/sector metadata, in one round trip.

        refs: (year, gp_round, session_type, driver_code, lap_type) tuples.
        Returns {ref: {'telemetry_data', 'lap_number', 'lap_time',
        'sector1_time', 'sector2_time', 'sector3_time'}} — refs with no
        stored telemetry are simply absent.
        """
        if not refs:
            return {}
        rows = self._execute(
            """
            SELECT t.year, t.gp_round, t.session_type, t.driver_code, t.lap_type,
                   t.telemetry_data, t.lap_number,
                   l.lap_time, l.sector1_time, l.sector2_time, l.sector3_time
            FROM unnest(%s::int[], %s::int[], %s::text[], %s::text[], %s::text[])
                 AS r(year, gp_round, session_type, driver_code, lap_type)
            JOIN telemetry t
              ON t.year = r.year AND t.gp_round = r.gp_round AND t.session_type = r.session_type
             AND t.driver_code = r.driver_code AND t.lap_type = r.lap_type
            LEFT JOIN laps l
              ON l.year = t.year AND l.gp_round = t.gp_round AND l.session_type = t.session_type
             AND l.driver_code = t.driver_code AND l.lap_number = t.lap_number
            """,
            tuple(list(col) for col in zip(*refs)),
            fetch="all",
        )
        out = {}
        for year, gp_round, session_type, driver_code, lap_type, data, lap_number, lt, s1, s2, s3 in rows or []:
            out[(year, gp_round, session_type, driver_code, lap_type)] = {
                "telemetry_data": _clean_telemetry_data(data),
                "lap_number": lap_number,
                "lap_time": lt,
                "sector1_time": s1,
                "sector2_time": s2,
                "sector3_time": s3,
            }
        return out

    def save_telemetry(
        self,
        year: int,
        gp_round: int,
        session_type: str,
        driver_code: str,
        lap_number: int,
        lap_type: str,
        telemetry_data: dict,
    ):
        self._execute(
            """
            INSERT INTO telemetry
                (year, gp_round, session_type, driver_code, lap_number, lap_type, telemetry_data)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (year, gp_round, session_type, driver_code, lap_type) DO UPDATE
                SET telemetry_data = EXCLUDED.telemetry_data,
                    lap_number     = EXCLUDED.lap_number,
                    created_at     = NOW()
            """,
            (
                year,
                gp_round,
                session_type,
                driver_code,
                lap_number,
                lap_type,
                json.dumps(telemetry_data),
            ),
        )

    # ------------------------------------------------------------------
    # Laps
    # ------------------------------------------------------------------
    def get_laps(
        self,
        year: int,
        gp_round: int,
        session_type: str,
        driver_code: str,
    ) -> list[dict]:
        """Returns list of lap dicts ordered by lap_number."""
        rows = self._execute(
            """
            SELECT lap_number, lap_time, sector1_time, sector2_time, sector3_time,
                   compound, is_personal_best, telemetry_available
            FROM laps
            WHERE year = %s AND gp_round = %s AND session_type = %s AND driver_code = %s
            ORDER BY lap_number
            """,
            (year, gp_round, session_type, driver_code),
            fetch="all",
        )
        if not rows:
            return []
        keys = [
            "lap_number", "lap_time", "sector1_time", "sector2_time", "sector3_time",
            "compound", "is_personal_best", "telemetry_available",
        ]
        return [dict(zip(keys, row)) for row in rows]

    def save_lap(
        self,
        year: int,
        gp_round: int,
        session_type: str,
        driver_code: str,
        lap_number: int,
        lap_time: Optional[float],
        sector1: Optional[float],
        sector2: Optional[float],
        sector3: Optional[float],
        compound: Optional[str],
        is_personal_best: bool,
        telemetry_available: bool,
    ):
        self._execute(
            """
            INSERT INTO laps
                (year, gp_round, session_type, driver_code, lap_number,
                 lap_time, sector1_time, sector2_time, sector3_time,
                 compound, is_personal_best, telemetry_available)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (year, gp_round, session_type, driver_code, lap_number) DO UPDATE
                SET lap_time           = EXCLUDED.lap_time,
                    sector1_time       = EXCLUDED.sector1_time,
                    sector2_time       = EXCLUDED.sector2_time,
                    sector3_time       = EXCLUDED.sector3_time,
                    compound           = EXCLUDED.compound,
                    is_personal_best   = EXCLUDED.is_personal_best,
                    telemetry_available = EXCLUDED.telemetry_available
            """,
            (
                year, gp_round, session_type, driver_code, lap_number,
                lap_time, sector1, sector2, sector3,
                compound, is_personal_best, telemetry_available,
            ),
        )

    def set_lap_compounds(
        self,
        year: int,
        gp_round: int,
        session_type: str,
        rows: list[tuple],
    ) -> int:
        """Sets the tyre compound of existing laps in one statement.
        rows: (compound, driver_code, lap_number). Returns laps updated."""
        if not rows:
            return 0
        updated = self._execute(
            """
            UPDATE laps l SET compound = v.compound
            FROM unnest(%s::text[], %s::text[], %s::int[]) AS v(compound, driver_code, lap_number)
            WHERE l.year = %s AND l.gp_round = %s AND l.session_type = %s
              AND l.driver_code = v.driver_code AND l.lap_number = v.lap_number
            RETURNING l.lap_number
            """,
            (*(list(col) for col in zip(*rows)), year, gp_round, session_type),
            fetch="all",
        )
        return len(updated or [])

    def count_ingested(self, year: int, gp_round: int, session_type: str) -> dict:
        """Laps and telemetry rows stored for one session."""
        counts = {}
        for table in ("laps", "telemetry"):
            row = self._execute(
                f"SELECT COUNT(*) FROM {table} WHERE year=%s AND gp_round=%s AND session_type=%s",
                (year, gp_round, session_type),
                fetch="one",
            )
            counts[table] = row[0] if row else 0
        return counts


# Global instance
db = PostgresDB()
