import redis
import json
import os
import time
import fnmatch
from typing import Optional, Any
import logging

logger = logging.getLogger(__name__)

class RedisCache:
    """
    Service Redis pour cache backend partagé entre tous les users.

    Gère automatiquement :
    - Connexion Redis avec fallback si down
    - Sérialisation/désérialisation JSON
    - TTL intelligent par type de données
    - Gestion d'erreurs (l'app continue même si Redis crash)

    Quand Redis n'est pas configuré (dev local sans REDIS_URL), bascule sur un
    cache en mémoire process avec la même sémantique de TTL. Sans ça, chaque
    requête retape les APIs externes (OpenF1/FastF1) à froid — y compris les
    requêtes répétées pour la même session pendant un test manuel — ce qui
    épuise vite les quotas de rate-limit en dev. En production, REDIS_URL est
    toujours configuré donc ce chemin n'est jamais emprunté.
    """

    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self._mem_cache: dict[str, tuple[float, Any]] = {}
        self._connect()
    
    def _connect(self):
        """Connecte à Redis via REDIS_URL (Railway)"""
        try:
            redis_url = os.getenv('REDIS_URL')
            
            if not redis_url:
                logger.warning("⚠️ REDIS_URL not found - Redis cache disabled")
                return
            
            self.client = redis.from_url(
                redis_url,
                decode_responses=True,  # Auto-decode bytes → str
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            
            # Test connexion
            self.client.ping()
            logger.info("✅ Redis connected successfully")
            
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
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
        """
        Récupère une valeur du cache.

        Returns:
            - Données désérialisées si trouvées
            - None si pas trouvé ou Redis down
        """
        if not self.client:
            return self._mem_get(key)

        try:
            value = self.client.get(key)
            
            if value is None:
                return None
            
            # Désérialiser JSON
            data = json.loads(value)
            logger.info(f"✅ Cache HIT: {key}")
            return data
            
        except redis.RedisError as e:
            logger.error(f"❌ Redis GET error for {key}: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON decode error for {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """
        Stocke une valeur dans le cache.
        
        Args:
            key: Clé Redis (ex: "laps:2025:1:Q:VER")
            value: Données à stocker (dict, list, etc.)
            ttl: Time To Live en secondes (default: 1h)
        
        Returns:
            True si succès, False si échec
        """
        if not self.client:
            self._mem_set(key, value, ttl)
            return True

        try:
            # Sérialiser en JSON
            serialized = json.dumps(value)
            
            # Stocker avec TTL
            self.client.setex(key, ttl, serialized)
            
            logger.info(f"💾 Cache SET: {key} (TTL: {ttl}s)")
            return True
            
        except redis.RedisError as e:
            logger.error(f"❌ Redis SET error for {key}: {e}")
            return False
        except (TypeError, ValueError) as e:
            logger.error(f"❌ JSON encode error for {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Supprime une clé du cache"""
        if not self.client:
            return self._mem_cache.pop(key, None) is not None

        try:
            self.client.delete(key)
            logger.info(f"🗑️ Cache DELETE: {key}")
            return True
        except redis.RedisError as e:
            logger.error(f"❌ Redis DELETE error for {key}: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """
        Supprime toutes les clés matchant un pattern.
        
        Exemple: delete_pattern("laps:2025:1:*") 
        → Supprime tous les laps du GP 1 de 2025
        """
        if not self.client:
            matched = [k for k in self._mem_cache if fnmatch.fnmatch(k, pattern)]
            for k in matched:
                del self._mem_cache[k]
            return len(matched)

        try:
            keys = self.client.keys(pattern)
            if keys:
                deleted = self.client.delete(*keys)
                logger.info(f"🗑️ Cache DELETE pattern {pattern}: {deleted} keys")
                return deleted
            return 0
        except redis.RedisError as e:
            logger.error(f"❌ Redis DELETE pattern error for {pattern}: {e}")
            return 0
    
    def flush_all(self) -> bool:
        """⚠️ VIDE TOUT LE CACHE - À utiliser avec précaution"""
        if not self.client:
            self._mem_cache.clear()
            return True

        try:
            self.client.flushall()
            logger.warning("🧹 Cache FLUSHED completely")
            return True
        except redis.RedisError as e:
            logger.error(f"❌ Redis FLUSH error: {e}")
            return False
    
    def get_cache_key_laps(self, year: int, gp: int, session: str, driver: str) -> str:
        """Génère une clé Redis pour session laps"""
        return f"laps:{year}:{gp}:{session}:{driver}"
    
    def get_cache_key_telemetry(
        self, 
        year: int, 
        gp: int, 
        session: str, 
        driver1: str, 
        lap1: Optional[int],
        driver2: str,
        lap2: Optional[int]
    ) -> str:
        """Génère une clé Redis pour télémétrie"""
        lap1_str = f"lap{lap1}" if lap1 is not None else "fastest"
        lap2_str = f"lap{lap2}" if lap2 is not None else "fastest"
        return f"telemetry:{year}:{gp}:{session}:{driver1}:{lap1_str}:{driver2}:{lap2_str}"
    
    def get_ttl_by_session_status(self, year: int, gp: int) -> int:
        """
        Retourne un TTL intelligent selon le statut du GP.
        
        - GP passé : 24h (données figées)
        - GP en cours : 5 min (peuvent changer)
        - GP futur : 1h (planning peut changer)
        """
        from datetime import datetime
        
        # TODO: Ajouter logique pour détecter si GP est en cours/passé/futur
        # Pour l'instant, on met 1h partout
        return 3600  # 1h par défaut
    
    def health_check(self) -> dict:
        """Check si Redis est accessible"""
        if not self.client:
            return {
                "status": "disconnected",
                "message": "Redis client not initialized"
            }
        
        try:
            self.client.ping()
            info = self.client.info('memory')
            
            return {
                "status": "connected",
                "used_memory_mb": round(info['used_memory'] / 1024 / 1024, 2),
                "max_memory_mb": round(info.get('maxmemory', 0) / 1024 / 1024, 2) if info.get('maxmemory') else "unlimited",
                "keys_count": self.client.dbsize()
            }
        except redis.RedisError as e:
            return {
                "status": "error",
                "message": str(e)
            }


# 🔥 INSTANCE GLOBALE - Utilisée dans main.py
redis_cache = RedisCache()