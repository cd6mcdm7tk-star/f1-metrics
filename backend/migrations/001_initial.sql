-- METRIK DELTA - Initial schema
-- Run once on a fresh PostgreSQL instance (Railway)
-- Idempotent: safe to re-run

CREATE TABLE IF NOT EXISTS telemetry (
    id             SERIAL PRIMARY KEY,
    year           INT          NOT NULL,
    gp_round       INT          NOT NULL,
    session_type   VARCHAR(10)  NOT NULL,
    driver_code    VARCHAR(3)   NOT NULL,
    lap_number     INT          NOT NULL,
    lap_type       VARCHAR(20)  NOT NULL,  -- 'fastest' | 'lap_N'
    telemetry_data JSONB        NOT NULL,  -- column-based arrays: {distance,speed,throttle,...}
    created_at     TIMESTAMP    DEFAULT NOW(),
    UNIQUE (year, gp_round, session_type, driver_code, lap_type)
);

CREATE TABLE IF NOT EXISTS laps (
    id                  SERIAL PRIMARY KEY,
    year                INT          NOT NULL,
    gp_round            INT          NOT NULL,
    session_type        VARCHAR(10)  NOT NULL,
    driver_code         VARCHAR(3)   NOT NULL,
    lap_number          INT          NOT NULL,
    lap_time            FLOAT,
    sector1_time        FLOAT,
    sector2_time        FLOAT,
    sector3_time        FLOAT,
    compound            VARCHAR(20),
    is_personal_best    BOOLEAN      DEFAULT FALSE,
    telemetry_available BOOLEAN      DEFAULT FALSE,
    created_at          TIMESTAMP    DEFAULT NOW(),
    UNIQUE (year, gp_round, session_type, driver_code, lap_number)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_lookup
    ON telemetry (year, gp_round, session_type, driver_code, lap_type);

CREATE INDEX IF NOT EXISTS idx_laps_lookup
    ON laps (year, gp_round, session_type, driver_code);
