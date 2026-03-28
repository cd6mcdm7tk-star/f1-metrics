"""
METRIK DELTA - PostgreSQL Database Layer
Connection pool + query helpers for pre-computed F1 data.
"""
import json
import logging
import math
import os
from typing import Any, Optional

import psycopg2
from psycopg2 import pool

logger = logging.getLogger(__name__)


class PostgresDB:
    def __init__(self):
        self.pool: Optional[pool.ThreadedConnectionPool] = None
        self._connect()

    def _connect(self):
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            logger.warning("DATABASE_URL not set - PostgreSQL disabled, falling back to FastF1")
            return
        try:
            self.pool = pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=10,
                dsn=database_url,
            )
            self.pool.getconn()  # test the connection
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
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(query, params)
                if fetch == "one":
                    result = cur.fetchone()
                elif fetch == "all":
                    result = cur.fetchall()
                else:
                    result = None
            conn.commit()
            return result
        except Exception as e:
            conn.rollback()
            logger.error(f"DB error: {e}")
            raise
        finally:
            self.pool.putconn(conn)

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
    def get_telemetry(
        self,
        year: int,
        gp_round: int,
        session_type: str,
        driver_code: str,
        lap_type: str,
    ) -> Optional[dict]:
        """
        Returns {'telemetry_data': {...}, 'lap_number': N} or None.
        telemetry_data is a column-based dict:
          {distance, speed, throttle, brake, gear, drs, rpm, x, y}
        """
        row = self._execute(
            """
            SELECT telemetry_data, lap_number
            FROM telemetry
            WHERE year = %s AND gp_round = %s AND session_type = %s
              AND driver_code = %s AND lap_type = %s
            """,
            (year, gp_round, session_type, driver_code, lap_type),
            fetch="one",
        )
        if row is None:
            return None
        telemetry_data, lap_number = row
        # psycopg2 returns JSONB as dict already
        if isinstance(telemetry_data, str):
            telemetry_data = json.loads(telemetry_data)
        # Nettoyer les NaN/Inf dans les données récupérées (listes ou scalaires)
        if telemetry_data:
            for key, value in telemetry_data.items():
                if isinstance(value, list):
                    telemetry_data[key] = [
                        0.0 if isinstance(v, float) and (math.isnan(v) or math.isinf(v)) else v
                        for v in value
                    ]
                elif isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                    telemetry_data[key] = 0.0
        return {"telemetry_data": telemetry_data, "lap_number": lap_number}

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

    def get_lap_metadata(
        self,
        year: int,
        gp_round: int,
        session_type: str,
        driver_code: str,
        lap_number: int,
    ) -> Optional[dict]:
        """Returns a single lap's metadata dict or None."""
        row = self._execute(
            """
            SELECT lap_number, lap_time, sector1_time, sector2_time, sector3_time,
                   compound, is_personal_best, telemetry_available
            FROM laps
            WHERE year = %s AND gp_round = %s AND session_type = %s
              AND driver_code = %s AND lap_number = %s
            """,
            (year, gp_round, session_type, driver_code, lap_number),
            fetch="one",
        )
        if row is None:
            return None
        keys = [
            "lap_number", "lap_time", "sector1_time", "sector2_time", "sector3_time",
            "compound", "is_personal_best", "telemetry_available",
        ]
        return dict(zip(keys, row))

    def get_fastest_lap_number(
        self,
        year: int,
        gp_round: int,
        session_type: str,
        driver_code: str,
    ) -> Optional[int]:
        """Returns the lap_number of the fastest timed lap for a driver."""
        row = self._execute(
            """
            SELECT lap_number FROM laps
            WHERE year = %s AND gp_round = %s AND session_type = %s
              AND driver_code = %s AND lap_time IS NOT NULL
            ORDER BY lap_time ASC
            LIMIT 1
            """,
            (year, gp_round, session_type, driver_code),
            fetch="one",
        )
        return row[0] if row else None


# Global instance
db = PostgresDB()
