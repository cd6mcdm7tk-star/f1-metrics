from fastapi import HTTPException
from typing import Optional
import traceback

class APIError(Exception):
    """Erreur personnalisée pour l'API"""
    def __init__(self, message: str, status_code: int = 500, details: Optional[str] = None):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)

def handle_fastf1_error(e: Exception, context: str = "") -> HTTPException:
    """
    Convertit les erreurs FastF1 en messages clairs pour l'utilisateur
    """
    error_message = str(e).lower()
    
    # Session non trouvée
    if "session" in error_message and ("not found" in error_message or "does not exist" in error_message):
        return HTTPException(
            status_code=404,
            detail={
                "error": "Session introuvable",
                "message": f"La session demandée n'existe pas pour cette course. {context}",
                "suggestion": "Vérifiez l'année, le Grand Prix et le type de session."
            }
        )
    
    # Données non disponibles
    if "no data" in error_message or "empty" in error_message:
        return HTTPException(
            status_code=404,
            detail={
                "error": "Données non disponibles",
                "message": f"Aucune donnée disponible pour cette requête. {context}",
                "suggestion": "Cette session n'a peut-être pas encore eu lieu ou les données ne sont pas disponibles."
            }
        )
    
    # Pilote non trouvé
    if "driver" in error_message and "not found" in error_message:
        return HTTPException(
            status_code=404,
            detail={
                "error": "Pilote introuvable",
                "message": f"Le pilote demandé n'a pas participé à cette session. {context}",
                "suggestion": "Vérifiez le code du pilote (ex: VER, HAM, LEC)."
            }
        )
    
    # Problème de connexion
    if "connection" in error_message or "timeout" in error_message or "network" in error_message:
        return HTTPException(
            status_code=503,
            detail={
                "error": "Erreur de connexion",
                "message": "Impossible de récupérer les données. Problème de connexion au service FastF1.",
                "suggestion": "Réessayez dans quelques instants."
            }
        )
    
    # Erreur générique
    print(f"❌ Erreur non gérée: {e}")
    traceback.print_exc()
    
    return HTTPException(
        status_code=500,
        detail={
            "error": "Erreur serveur",
            "message": f"Une erreur est survenue lors du traitement. {context}",
            "suggestion": "Contactez le support si le problème persiste.",
            "technical_details": str(e) if __debug__ else None
        }
    )

def log_request(endpoint: str, params: dict):
    """Log les requêtes pour le debugging"""
    print(f"📡 API Request: {endpoint}")
    print(f"   Params: {params}")

def log_success(endpoint: str, cache_hit: bool = False):
    """Log les succès"""
    cache_status = "✅ CACHE" if cache_hit else "🔄 FRESH"
    print(f"{cache_status} {endpoint} - Success")

def log_error(endpoint: str, error: Exception):
    """Log les erreurs"""
    print(f"❌ {endpoint} - Error: {str(error)}")