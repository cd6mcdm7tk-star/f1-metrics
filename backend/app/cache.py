"""Shared Redis cache. Falls back to an in-process TTL cache when REDIS_URL
isn't set (local dev), so repeated requests don't hit OpenF1/FastF1 cold and
burn through their rate limits. Redis errors never fail a request."""
import asyncio
import json
import logging
import os
import time
from typing import Any, Optional

import redis

logger = logging.getLogger(__name__)


class RedisCache:
    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self._mem_cache: dict[str, tuple[float, Any]] = {}
        self._connect()

    def _connect(self):
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            logger.warning("REDIS_URL not set, using an in-memory cache")
            return
        try:
            self.client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
            self.client.ping()
            logger.info("Redis connected")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            self.client = None

    def _mem_get(self, key: str) -> Optional[Any]:
        entry = self._mem_cache.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.time() >= expires_at:
            del self._mem_cache[key]
            return None
        return value

    def _mem_set(self, key: str, value: Any, ttl: int) -> None:
        self._mem_cache[key] = (time.time() + ttl, value)

    def get(self, key: str) -> Optional[Any]:
        if not self.client:
            return self._mem_get(key)
        try:
            value = self.client.get(key)
            return None if value is None else json.loads(value)
        except (redis.RedisError, json.JSONDecodeError) as e:
            logger.error(f"Cache GET failed for {key}: {e}")
            return None

    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        if not self.client:
            self._mem_set(key, value, ttl)
            return True
        try:
            self.client.setex(key, ttl, json.dumps(value))
            return True
        except (redis.RedisError, TypeError, ValueError) as e:
            logger.error(f"Cache SET failed for {key}: {e}")
            return False

    def get_raw(self, key: str) -> Optional[str]:
        """The stored JSON text as is — returned straight in the HTTP response
        instead of being decoded and re-encoded, which is costly on large
        payloads (multi-lap telemetry)."""
        if not self.client:
            value = self._mem_get(key)
            return None if value is None else json.dumps(value)
        try:
            return self.client.get(key)
        except redis.RedisError as e:
            logger.error(f"Cache GET failed for {key}: {e}")
            return None

    def set_raw(self, key: str, serialized: str, ttl: int = 3600) -> bool:
        """set() for a value that is already JSON text."""
        if not self.client:
            self._mem_set(key, json.loads(serialized), ttl)
            return True
        try:
            self.client.setex(key, ttl, serialized)
            return True
        except redis.RedisError as e:
            logger.error(f"Cache SET failed for {key}: {e}")
            return False

    # The Redis client is synchronous: called straight from an async route,
    # each network round trip would block the whole event loop.
    async def aget(self, key: str) -> Optional[Any]:
        return await asyncio.to_thread(self.get, key)

    async def aget_raw(self, key: str) -> Optional[str]:
        return await asyncio.to_thread(self.get_raw, key)

    @staticmethod
    def laps_key(year: int, gp: int, session: str, driver: str) -> str:
        return f"laps:{year}:{gp}:{session}:{driver}"

    @staticmethod
    def telemetry_key(year: int, gp: int, session: str, driver1: str, lap1: Optional[int],
                      driver2: str, lap2: Optional[int]) -> str:
        lap1_str = f"lap{lap1}" if lap1 is not None else "fastest"
        lap2_str = f"lap{lap2}" if lap2 is not None else "fastest"
        return f"telemetry:{year}:{gp}:{session}:{driver1}:{lap1_str}:{driver2}:{lap2_str}"


redis_cache = RedisCache()
