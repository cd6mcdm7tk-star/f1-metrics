import os
import pickle
from pathlib import Path
from datetime import datetime, timedelta
import hashlib

class FastF1Cache:
    def __init__(self, cache_dir: str = "cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.ttl_hours = 24  # Cache valide pendant 24h
    
    def _get_cache_key(self, *args) -> str:
        """Génère une clé de cache unique basée sur les arguments"""
        key_string = "_".join(str(arg) for arg in args)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _get_cache_path(self, cache_key: str) -> Path:
        """Retourne le chemin du fichier de cache"""
        return self.cache_dir / f"{cache_key}.pkl"
    
    def get(self, *args):
        """Récupère des données du cache si elles existent et sont valides"""
        cache_key = self._get_cache_key(*args)
        cache_path = self._get_cache_path(cache_key)
        
        if not cache_path.exists():
            return None
        
        # Vérifier si le cache n'est pas expiré
        file_time = datetime.fromtimestamp(cache_path.stat().st_mtime)
        if datetime.now() - file_time > timedelta(hours=self.ttl_hours):
            cache_path.unlink()  # Supprimer le cache expiré
            return None
        
        try:
            with open(cache_path, 'rb') as f:
                return pickle.load(f)
        except Exception as e:
            print(f"Erreur lecture cache: {e}")
            return None
    
    def set(self, data, *args):
        """Sauvegarde des données dans le cache"""
        cache_key = self._get_cache_key(*args)
        cache_path = self._get_cache_path(cache_key)
        
        try:
            with open(cache_path, 'wb') as f:
                pickle.dump(data, f)
        except Exception as e:
            print(f"Erreur écriture cache: {e}")
    
    def clear(self):
        """Nettoie tous les fichiers de cache"""
        for cache_file in self.cache_dir.glob("*.pkl"):
            cache_file.unlink()
    
    def clear_old(self):
        """Nettoie uniquement les fichiers de cache expirés"""
        for cache_file in self.cache_dir.glob("*.pkl"):
            file_time = datetime.fromtimestamp(cache_file.stat().st_mtime)
            if datetime.now() - file_time > timedelta(hours=self.ttl_hours):
                cache_file.unlink()

# Instance globale du cache
cache = FastF1Cache()