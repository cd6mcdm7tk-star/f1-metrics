from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from app.utils.services.redis_cache import redis_cache
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import asyncio
import logging
import math
import traceback

logger = logging.getLogger(__name__)
import fastf1
import pandas as pd
import numpy as np
from scipy.interpolate import interp1d
import requests
from app.utils.cache import cache as api_cache
from app.utils.error_handler import handle_fastf1_error, log_request, log_success, log_error
from stripe_routes import router as stripe_router
from routes.livetiming import router as livetiming_router

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Créer l'app FastAPI
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Configuration CORS - LOCAL + PRODUCTION
ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Local dev
    "http://localhost:3000",  # Alternative local
    "https://metrikdelta.com",  # Production
    "https://www.metrikdelta.com",  # Production with www
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,  # True maintenant qu'on a des origins spécifiques
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Stripe router
app.include_router(stripe_router, prefix="/api/stripe", tags=["stripe"])

# Include Live Timing router (F1 proxy)
app.include_router(livetiming_router)

# Cache FastF1
cache_dir = 'cache'
fastf1.Cache.enable_cache(cache_dir)
api_cache.clear_old()


# Root endpoint
@app.get("/")
async def root():
    return {
        "name": "METRIK DELTA API",
        "version": "1.0.0",
        "status": "online",
        "endpoints": {
            "stripe": "/api/stripe",
            "livetiming": "/api/livetiming",
            "health": "/health"
        }
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}



# 🔥 ENDPOINT GRANDS-PRIX AVEC REDIS

@app.get("/api/grands-prix/{year}")
@limiter.limit("30/minute")
async def get_grands_prix(request: Request, year: int):
    try:
        # 🔥 ÉTAPE 1 : Vérifier Redis cache
        cache_key = f"grands_prix:{year}"
        cached_data = redis_cache.get(cache_key)
        
        if cached_data:
            return cached_data
        
        # 🔥 ÉTAPE 2 : Cache MISS → Calculer
        schedule = await asyncio.to_thread(fastf1.get_event_schedule, year)
        grands_prix = []
        
        for idx, event in schedule.iterrows():
            event_type = event.get('EventFormat', '')
            # Filtrer les événements de test
            if event_type == 'testing':
                continue
            
            gp_info = {
                "round": int(event['RoundNumber']),
                "country": event['Country'],
                "location": event['Location'],
                "name": event['Location'],
                "official_name": event['OfficialEventName'],
                "date": event['EventDate'].strftime('%Y-%m-%d')
            }
            grands_prix.append(gp_info)
        
        result = {"grands_prix": grands_prix}
        
        # 🔥 ÉTAPE 3 : Sauvegarder dans Redis (TTL 24h - calendrier ne change jamais)
        redis_cache.set(cache_key, result, ttl=86400)
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching GPs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 🔥 ENDPOINT DRIVERS AVEC REDIS

@app.get("/api/drivers/{year}/{gp_round}/{session_type}")
@limiter.limit("20/minute")
async def get_drivers(request: Request, year: int, gp_round: int, session_type: str):
    try:
        # Log de la requête
        log_request("/api/drivers", {"year": year, "gp_round": gp_round, "session_type": session_type})
        
        # 🔥 ÉTAPE 1 : Vérifier Redis cache
        cache_key = f"drivers:{year}:{gp_round}:{session_type}"
        cached_data = redis_cache.get(cache_key)
        
        if cached_data:
            log_success("/api/drivers", cache_hit=True)
            return cached_data
        
        # 🔥 ÉTAPE 2 : Cache MISS → Calculer
        session = fastf1.get_session(year, gp_round, session_type)
        await asyncio.to_thread(session.load)

        drivers = []
        for driver_code in session.drivers:
            driver_info = session.get_driver(driver_code)
            drivers.append({
                'abbreviation': str(driver_info['Abbreviation']),
                'number': str(driver_info['DriverNumber']),
                'team': str(driver_info['TeamName']),
                'fullName': str(driver_info['FullName']) if 'FullName' in driver_info else str(driver_info['Abbreviation'])
            })
        
        # 🔥 ÉTAPE 3 : Sauvegarder dans Redis (TTL 1h)
        redis_cache.set(cache_key, drivers, ttl=3600)
        
        log_success("/api/drivers", cache_hit=False)
        return drivers
        
    except Exception as e:
        log_error("/api/drivers", e)
        raise handle_fastf1_error(e, f"Année: {year}, GP: {gp_round}, Session: {session_type}")

@app.get("/api/telemetry/{year}/{gp_round}/{session_type}/{driver1}/{driver2}")
@limiter.limit("10/minute")
async def get_telemetry_comparison(
    request: Request,
    year: int, 
    gp_round: int, 
    session_type: str, 
    driver1: str, 
    driver2: str,
    lap_number1: int = Query(None),  # 🔥 Lap pour driver1
    lap_number2: int = Query(None),  # 🔥 Lap pour driver2
):
    try:
        log_request("/api/telemetry", {
            "year": year,
            "gp_round": gp_round,
            "session_type": session_type,
            "driver1": driver1,
            "driver2": driver2,
            "lap_number1": lap_number1,
            "lap_number2": lap_number2,
        })
        
        # 🔥 ÉTAPE 1 : Vérifier Redis cache
        cache_key = redis_cache.get_cache_key_telemetry(
            year, gp_round, session_type, 
            driver1, lap_number1, 
            driver2, lap_number2
        )
        cached_data = redis_cache.get(cache_key)
        
        if cached_data:
            log_success("/api/telemetry", cache_hit=True)
            return cached_data
        
        # 🔥 ÉTAPE 2 : Cache MISS → Calculer avec FastF1
        session = fastf1.get_session(year, gp_round, session_type)
        await asyncio.to_thread(session.load)

        # 🔥 RÉCUPÉRER LAP1 (driver1)
        if lap_number1 is not None:
            # Lap spécifique pour driver1
            laps1 = session.laps.pick_drivers(driver1)
            lap1_filtered = laps1[laps1['LapNumber'] == lap_number1]
            
            if lap1_filtered.empty:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Lap {lap_number1} not found for {driver1}"
                )
            
            lap1 = lap1_filtered.iloc[0]
        else:
            # Fastest lap par défaut
            lap1 = session.laps.pick_drivers(driver1).pick_fastest()
        
        # 🔥 RÉCUPÉRER LAP2 (driver2)
        if lap_number2 is not None:
            # Lap spécifique pour driver2
            laps2 = session.laps.pick_drivers(driver2)
            lap2_filtered = laps2[laps2['LapNumber'] == lap_number2]
            
            if lap2_filtered.empty:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Lap {lap_number2} not found for {driver2}"
                )
            
            lap2 = lap2_filtered.iloc[0]
        else:
            # Fastest lap par défaut
            lap2 = session.laps.pick_drivers(driver2).pick_fastest()
        
        if lap1 is None or lap2 is None:
            missing_driver = driver1 if lap1 is None else driver2
            raise Exception(f"Driver {missing_driver} not found or no valid laps available")
        
        # 🔥 RÉCUPÉRER LES SECTEURS
        sectors_driver1 = {
            "sector1": float(lap1['Sector1Time'].total_seconds()) if pd.notna(lap1['Sector1Time']) else None,
            "sector2": float(lap1['Sector2Time'].total_seconds()) if pd.notna(lap1['Sector2Time']) else None,
            "sector3": float(lap1['Sector3Time'].total_seconds()) if pd.notna(lap1['Sector3Time']) else None,
        }
        
        sectors_driver2 = {
            "sector1": float(lap2['Sector1Time'].total_seconds()) if pd.notna(lap2['Sector1Time']) else None,
            "sector2": float(lap2['Sector2Time'].total_seconds()) if pd.notna(lap2['Sector2Time']) else None,
            "sector3": float(lap2['Sector3Time'].total_seconds()) if pd.notna(lap2['Sector3Time']) else None,
        }
        
        # ✅ RÉCUPÉRATION TÉLÉMÉTRIE BRUTE
        tel1 = lap1.get_telemetry().add_distance()
        tel2 = lap2.get_telemetry().add_distance()
        
        # Détecter la colonne RPM (plusieurs noms possibles)
        rpm_col = None
        for possible_col in ['RPM', 'nRPM', 'Rpm', 'EngineRPM']:
            if possible_col in tel1.columns:
                rpm_col = possible_col
                break
        
        # ✅ INTERPOLATION SUR GRILLE COMMUNE (synchronisation parfaite)
        # Déterminer la plage de distance commune
        min_distance = max(tel1['Distance'].min(), tel2['Distance'].min())
        max_distance = min(tel1['Distance'].max(), tel2['Distance'].max())
        
        # Créer grille uniforme de 1000 points
        common_distance = np.linspace(min_distance, max_distance, 1000)
        
        # ===== DRIVER 1 =====
        # Interpolation linéaire pour valeurs continues
        interp_speed1 = interp1d(tel1['Distance'], tel1['Speed'], kind='linear', bounds_error=False, fill_value=0)
        interp_throttle1 = interp1d(tel1['Distance'], tel1['Throttle'], kind='linear', bounds_error=False, fill_value=0)
        
        # Interpolation nearest pour valeurs discrètes
        interp_brake1 = interp1d(tel1['Distance'], tel1['Brake'].astype(int), kind='nearest', bounds_error=False, fill_value=0)
        interp_gear1 = interp1d(tel1['Distance'], tel1['nGear'], kind='nearest', bounds_error=False, fill_value=0)
        interp_drs1 = interp1d(tel1['Distance'], tel1['DRS'], kind='nearest', bounds_error=False, fill_value=0)
        
        # 🔥 RPM - linéaire car valeur continue
        if rpm_col and rpm_col in tel1.columns:
            interp_rpm1 = interp1d(tel1['Distance'], tel1[rpm_col], kind='linear', bounds_error=False, fill_value=10000)
        else:
            interp_rpm1 = lambda x: 10000  # Fallback si RPM pas disponible
        
        # Interpoler positions GPS (linéaire)
        interp_x1 = interp1d(tel1['Distance'], tel1['X'], kind='linear', bounds_error=False, fill_value='extrapolate')
        interp_y1 = interp1d(tel1['Distance'], tel1['Y'], kind='linear', bounds_error=False, fill_value='extrapolate')
        
        # ===== DRIVER 2 =====
        interp_speed2 = interp1d(tel2['Distance'], tel2['Speed'], kind='linear', bounds_error=False, fill_value=0)
        interp_throttle2 = interp1d(tel2['Distance'], tel2['Throttle'], kind='linear', bounds_error=False, fill_value=0)
        interp_brake2 = interp1d(tel2['Distance'], tel2['Brake'].astype(int), kind='nearest', bounds_error=False, fill_value=0)
        interp_gear2 = interp1d(tel2['Distance'], tel2['nGear'], kind='nearest', bounds_error=False, fill_value=0)
        interp_drs2 = interp1d(tel2['Distance'], tel2['DRS'], kind='nearest', bounds_error=False, fill_value=0)
        
        # 🔥 RPM
        if rpm_col and rpm_col in tel2.columns:
            interp_rpm2 = interp1d(tel2['Distance'], tel2[rpm_col], kind='linear', bounds_error=False, fill_value=10000)
        else:
            interp_rpm2 = lambda x: 10000
        
        # ===== CONSTRUIRE TELEMETRY_DATA SYNCHRONISÉ AVEC DELTA =====
        telemetry_data = []
        cumulative_time1 = 0.0
        cumulative_time2 = 0.0
        prev_speed1 = 0.0
        prev_speed2 = 0.0
        
        for i, dist in enumerate(common_distance):
            speed1 = float(interp_speed1(dist))
            speed2 = float(interp_speed2(dist))
            
            # 🔥 CALCUL DU DELTA CUMULATIF
            if i > 0:
                # Distance parcourue depuis le dernier point
                segment_distance = dist - common_distance[i-1]
                
                # Vitesse moyenne sur le segment (en m/s)
                avg_speed1 = (speed1 + prev_speed1) / 2 / 3.6  # km/h → m/s
                avg_speed2 = (speed2 + prev_speed2) / 2 / 3.6
                
                # Temps pour parcourir ce segment
                if avg_speed1 > 0:
                    cumulative_time1 += segment_distance / avg_speed1
                if avg_speed2 > 0:
                    cumulative_time2 += segment_distance / avg_speed2
            
            # Delta = temps Driver2 - temps Driver1 (positif = Driver1 plus rapide)
            delta = cumulative_time2 - cumulative_time1
            
            telemetry_data.append({
                'distance': float(dist),
                'speed1': speed1,
                'speed2': speed2,
                'throttle1': float(interp_throttle1(dist)),
                'throttle2': float(interp_throttle2(dist)),
                'brake1': bool(interp_brake1(dist)),
                'brake2': bool(interp_brake2(dist)),
                'gear1': int(interp_gear1(dist)),
                'gear2': int(interp_gear2(dist)),
                'drs1': int(interp_drs1(dist)),
                'drs2': int(interp_drs2(dist)),
                'x': float(interp_x1(dist)),
                'y': float(interp_y1(dist)),
                'delta': float(delta),  # 🔥 Delta cumulatif précis
                'rpm1': float(interp_rpm1(dist)),  # 🔥 RPM
                'rpm2': float(interp_rpm2(dist)),  # 🔥 RPM
            })
            
            # Sauvegarder vitesses pour le prochain segment
            prev_speed1 = speed1
            prev_speed2 = speed2
        
        result = {
            'telemetry': telemetry_data,
            'lapTime1': float(lap1['LapTime'].total_seconds()) if pd.notna(lap1['LapTime']) else None,
            'lapTime2': float(lap2['LapTime'].total_seconds()) if pd.notna(lap2['LapTime']) else None,
            'sectors1': sectors_driver1,
            'sectors2': sectors_driver2,
            'driver1': driver1,
            'driver2': driver2,
            'lapNumber1': int(lap1['LapNumber']) if pd.notna(lap1['LapNumber']) else lap_number1,
            'lapNumber2': int(lap2['LapNumber']) if pd.notna(lap2['LapNumber']) else lap_number2,
        }
        
        # 🔥 ÉTAPE 3 : Sauvegarder dans Redis avec TTL 1h
        redis_cache.set(cache_key, result, ttl=3600)
        
        log_success("/api/telemetry", cache_hit=False)
        return result
        
    except Exception as e:
        log_error("/api/telemetry", e)
        error_msg = f"Pilotes: {driver1} vs {driver2}, {year} GP{gp_round} {session_type}"
        if lap_number1:
            error_msg += f" Lap1 {lap_number1}"
        if lap_number2:
            error_msg += f" Lap2 {lap_number2}"
        raise handle_fastf1_error(e, error_msg)

@app.get("/api/session-laps/{year}/{gp_round}/{session_type}/{driver}")
@limiter.limit("10/minute")
async def get_session_laps(
    request: Request,
    year: int,
    gp_round: int, 
    session_type: str,
    driver: str
):
    """
    Retourne TOUS les lap times d'un pilote pour une session donnée
    Format GP Tempo compatible avec HasTelemetry flag
    🔥 AVEC REDIS CACHE
    """
    try:
        log_request("/api/session-laps", {
            "year": year,
            "gp_round": gp_round,
            "session_type": session_type,
            "driver": driver
        })
        
        # 🔥 ÉTAPE 1 : Vérifier Redis cache
        cache_key = redis_cache.get_cache_key_laps(year, gp_round, session_type, driver)
        cached_data = redis_cache.get(cache_key)
        
        if cached_data:
            log_success("/api/session-laps", cache_hit=True)
            return cached_data
        
        # 🔥 ÉTAPE 2 : Cache MISS → Calculer avec FastF1
        # Charger la session
        session = fastf1.get_session(year, gp_round, session_type)
        await asyncio.to_thread(session.load)

        # 🔥 RÉCUPÉRER TOUS LES LAPS du pilote
        all_laps = session.laps
        driver_laps = all_laps[all_laps['Driver'] == driver]
        
        if driver_laps.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No laps found for driver {driver}"
            )
        
        # 🔥 RÉCUPÉRER INFOS PILOTE (Team)
        driver_info = session.get_driver(driver)
        team_name = driver_info['TeamName'] if driver_info is not None else "Unknown"
        
        # 🔥 FASTEST LAP pour IsPersonalBest
        fastest_lap_time = driver_laps['LapTime'].min()
        
        laps_data = []
        for idx, lap in driver_laps.iterrows():
            lap_time = lap['LapTime']
            lap_number = lap['LapNumber']
            
            # ✅ Vérifier si le lap a de la télémétrie disponible
            # Utilise IsAccurate (déjà en mémoire) au lieu de charger toute la télémétrie
            # pour chaque lap — évite O(n) appels get_telemetry()
            has_telemetry = bool(
                pd.notna(lap.get('IsAccurate')) and lap.get('IsAccurate') == True
                and pd.notna(lap_time)
            )
            
            # ✅ Inclure TOUS les laps (même ceux sans temps valide)
            # GP Tempo montre tous les laps, même les outlaps/inlaps
            
            # 🔥 SECTEURS
            sector1 = float(lap['Sector1Time'].total_seconds()) if pd.notna(lap['Sector1Time']) else None
            sector2 = float(lap['Sector2Time'].total_seconds()) if pd.notna(lap['Sector2Time']) else None
            sector3 = float(lap['Sector3Time'].total_seconds()) if pd.notna(lap['Sector3Time']) else None
            
            # 🔥 LAP TIME en secondes (float)
            lap_time_seconds = float(lap_time.total_seconds()) if pd.notna(lap_time) else None
            
            # 🔥 FLAGS
            is_personal_best = (lap_time == fastest_lap_time) if pd.notna(lap_time) and pd.notna(fastest_lap_time) else False
            
            # IsHotLap = lap avec temps valide et non marqué comme Out/In lap
            # Dans FastF1, un "hot lap" a généralement un LapTime valide et n'est pas un outlap
            is_hot_lap = pd.notna(lap_time) and not lap.get('IsAccurate', True) == False
            
            # 🔥 WEATHER DATA (si disponible)
            air_temp = float(lap['AirTemp']) if pd.notna(lap.get('AirTemp')) else None
            track_temp = float(lap['TrackTemp']) if pd.notna(lap.get('TrackTemp')) else None
            
            # 🔥 COMPOUND (pneu)
            compound = lap['Compound'] if pd.notna(lap.get('Compound')) else None
            
            laps_data.append({
                # GP Tempo format
                "Position": None,  # Position in race (not relevant for practice/quali)
                "Id": f"{year}_{gp_round}_{lap_number}_{driver}",  # Unique identifier
                "LapNumber": int(lap_number) if pd.notna(lap_number) else None,
                "LapTime": lap_time_seconds,  # 🔥 Float en secondes
                "Sector1Time": sector1,
                "Sector2Time": sector2,
                "Sector3Time": sector3,
                "IsPersonalBest": bool(is_personal_best),
                "IsHotLap": bool(is_hot_lap),
                "HasTelemetry": bool(has_telemetry),  # 🔥 FLAG CRUCIAL pour ⊕ icon
                "Team": team_name,
                "Driver": driver,
                "Compound": compound,
                "AirTemp": air_temp,
                "TrackTemp": track_temp,
                "WindSpeed": None  # FastF1 ne fournit pas WindSpeed dans les laps
            })
        
        # Trier par numéro de tour
        laps_data.sort(key=lambda x: x['LapNumber'] if x['LapNumber'] is not None else 0)
        
        result = {
            'driver': driver,
            'team': team_name,
            'session': f"{year} R{gp_round} {session_type}",
            'year': year,
            'round': gp_round,
            'sessionType': session_type,
            'totalLaps': len(laps_data),
            'laps': laps_data  # 🔥 Format GP Tempo
        }
        
        # 🔥 ÉTAPE 3 : Sauvegarder dans Redis avec TTL 1h
        redis_cache.set(cache_key, result, ttl=3600)
        
        log_success("/api/session-laps", cache_hit=False)
        return result
        
    except Exception as e:
        log_error("/api/session-laps", e)
        raise handle_fastf1_error(e, f"Driver {driver}, {year} GP{gp_round} {session_type}")


@app.get("/api/animation-optimized/{year}/{gp_round}/{driver1}/{driver2}")
@limiter.limit("10/minute")
async def get_animation_optimized(request: Request, year: int, gp_round: int, driver1: str, driver2: str):
    """
    🎯 GPS BATTLE ANIMATION - SYNCHRONISÉ SUR LA DISTANCE DU TOUR
    
    CHANGEMENT MAJEUR : Les points sont synchronisés sur la DISTANCE (progress 0→1)
    au lieu du TEMPS pour avoir une synchronisation PARFAITE.
    
    Quand progress = 0.5 (50% du tour) :
    - Driver 1 à exactement 50% de SA distance
    - Driver 2 à exactement 50% de SA distance
    → Même position sur le circuit, télémétrie synchronisée !
    """
    try:
        log_request("/api/animation-optimized", {
            "year": year,
            "gp_round": gp_round,
            "driver1": driver1,
            "driver2": driver2
        })
        
        cache_key_parts = ['animation_optimized_v2', year, gp_round, driver1, driver2]
        cached_data = api_cache.get(*cache_key_parts)
        if cached_data:
            log_success("/api/animation-optimized", cache_hit=True)
            return cached_data
        
        session = fastf1.get_session(year, gp_round, 'Q')
        await asyncio.to_thread(session.load)
        
        lap1 = session.laps.pick_drivers(driver1).pick_fastest()
        lap2 = session.laps.pick_drivers(driver2).pick_fastest()
        
        if lap1 is None or lap2 is None:
            missing_driver = driver1 if lap1 is None else driver2
            raise HTTPException(status_code=404, detail=f"No fastest lap found for {missing_driver}")
        
        # Secteurs
        sector1_time1 = float(lap1['Sector1Time'].total_seconds()) if pd.notna(lap1['Sector1Time']) else None
        sector2_time1 = float(lap1['Sector2Time'].total_seconds()) if pd.notna(lap1['Sector2Time']) else None
        sector3_time1 = float(lap1['Sector3Time'].total_seconds()) if pd.notna(lap1['Sector3Time']) else None
        
        sector1_time2 = float(lap2['Sector1Time'].total_seconds()) if pd.notna(lap2['Sector1Time']) else None
        sector2_time2 = float(lap2['Sector2Time'].total_seconds()) if pd.notna(lap2['Sector2Time']) else None
        sector3_time2 = float(lap2['Sector3Time'].total_seconds()) if pd.notna(lap2['Sector3Time']) else None
        
        # Télémétrie + Position
        tel1 = lap1.get_telemetry().add_distance().reset_index(drop=True)
        tel2 = lap2.get_telemetry().add_distance().reset_index(drop=True)
        pos1 = lap1.get_pos_data().reset_index(drop=True)
        pos2 = lap2.get_pos_data().reset_index(drop=True)
        
        # SVG Path du circuit
        track_points = []
        min_pos_length = min(len(pos1), len(tel1))
        track_sample_step = max(1, min_pos_length // 200)
        
        for i in range(0, min_pos_length, track_sample_step):
            if i >= len(pos1):
                break
            track_points.append({
                'x': float(pos1.iloc[i]['X']),
                'y': float(pos1.iloc[i]['Y'])
            })
        
        # Normaliser coordonnées (viewBox 1000x1000)
        all_x = [p['x'] for p in track_points]
        all_y = [p['y'] for p in track_points]
        
        min_x, max_x = min(all_x), max(all_x)
        min_y, max_y = min(all_y), max(all_y)
        
        range_x = max_x - min_x
        range_y = max_y - min_y
        padding = 0.1
        
        min_x -= range_x * padding
        max_x += range_x * padding
        min_y -= range_y * padding
        max_y += range_y * padding
        
        range_x = max_x - min_x
        range_y = max_y - min_y
        
        for point in track_points:
            point['x'] = ((point['x'] - min_x) / range_x) * 1000
            point['y'] = ((point['y'] - min_y) / range_y) * 1000
        
        svg_path = f"M {track_points[0]['x']:.2f} {track_points[0]['y']:.2f}"
        for i in range(1, len(track_points)):
            svg_path += f" L {track_points[i]['x']:.2f} {track_points[i]['y']:.2f}"
        svg_path += " Z"
        
        # Détecter RPM
        rpm_col = None
        for possible_col in ['RPM', 'nRPM', 'Rpm', 'EngineRPM']:
            if possible_col in tel1.columns:
                rpm_col = possible_col
                break
        
        # 🔥 TÉLÉMÉTRIE DRIVER 1 - SYNCHRONISÉE SUR PROGRESS (0→1)
        driver1_telemetry = []
        min_length1 = min(len(tel1), len(pos1))
        step1 = max(1, min_length1 // 500)
        
        for i in range(0, min_length1, step1):
            if i >= len(tel1) or i >= len(pos1):
                continue
            
            point_tel = tel1.iloc[i]
            point_pos = pos1.iloc[i]
            
            normalized_x = ((float(point_pos['X']) - min_x) / range_x) * 1000
            normalized_y = ((float(point_pos['Y']) - min_y) / range_y) * 1000
            
            rpm_value = float(point_tel[rpm_col]) if rpm_col and pd.notna(point_tel.get(rpm_col)) else 10000
            
            # 🔥 PROGRESS = Position dans le tour (0.0 à 1.0)
            progress = i / (min_length1 - 1) if min_length1 > 1 else 0.0
            
            driver1_telemetry.append({
                'x': normalized_x,
                'y': normalized_y,
                'speed': float(point_tel['Speed']) if pd.notna(point_tel['Speed']) else 0.0,
                'throttle': float(point_tel['Throttle']) if pd.notna(point_tel['Throttle']) else 0.0,
                'brake': bool(point_tel['Brake']) if pd.notna(point_tel['Brake']) else False,
                'gear': int(point_tel['nGear']) if pd.notna(point_tel['nGear']) else 0,
                'drs': int(point_tel['DRS']) if pd.notna(point_tel['DRS']) else 0,
                'rpm': rpm_value,
                'progress': progress,  # 🔥 0.0 → 1.0 (distance dans le tour)
                'time': float(point_tel['Time'].total_seconds())  # Gardé pour info
            })
        
        # 🔥 TÉLÉMÉTRIE DRIVER 2 - SYNCHRONISÉE SUR PROGRESS (0→1)
        driver2_telemetry = []
        min_length2 = min(len(tel2), len(pos2))
        step2 = max(1, min_length2 // 500)
        
        for i in range(0, min_length2, step2):
            if i >= len(tel2) or i >= len(pos2):
                continue
            
            point_tel = tel2.iloc[i]
            point_pos = pos2.iloc[i]
            
            normalized_x = ((float(point_pos['X']) - min_x) / range_x) * 1000
            normalized_y = ((float(point_pos['Y']) - min_y) / range_y) * 1000
            
            rpm_value = float(point_tel[rpm_col]) if rpm_col and pd.notna(point_tel.get(rpm_col)) else 10000
            
            # 🔥 PROGRESS = Position dans le tour (0.0 à 1.0)
            progress = i / (min_length2 - 1) if min_length2 > 1 else 0.0
            
            driver2_telemetry.append({
                'x': normalized_x,
                'y': normalized_y,
                'speed': float(point_tel['Speed']) if pd.notna(point_tel['Speed']) else 0.0,
                'throttle': float(point_tel['Throttle']) if pd.notna(point_tel['Throttle']) else 0.0,
                'brake': bool(point_tel['Brake']) if pd.notna(point_tel['Brake']) else False,
                'gear': int(point_tel['nGear']) if pd.notna(point_tel['nGear']) else 0,
                'drs': int(point_tel['DRS']) if pd.notna(point_tel['DRS']) else 0,
                'rpm': rpm_value,
                'progress': progress,  # 🔥 0.0 → 1.0
                'time': float(point_tel['Time'].total_seconds())
            })
        
        # Couleurs team
        def get_team_color(driver_code: str) -> str:
            team_colors = {
                'VER': '#3671C6', 'TSU': '#3671C6',
                'LEC': '#E8002D', 'HAM': '#E8002D',
                'RUS': '#27F4D2', 'ANT': '#27F4D2',
                'NOR': '#FF8700', 'PIA': '#FF8700',
                'GAS': '#FF87BC', 'DOO': '#FF87BC', 'COL': '#FF87BC',
                'ALO': '#229971', 'STR': '#229971',
                'LAW': '#6692FF', 'HAD': '#6692FF',
                'HUL': '#00E701', 'BOR': '#00E701', 'BOT': '#00E701', 'ZHO': '#00E701',
                'OCO': '#B6BABD', 'BEA': '#B6BABD', 'MAG': '#B6BABD',
                'ALB': '#00A0DE', 'SAI': '#00A0DE', 'SAR': '#00A0DE',
            }
            return team_colors.get(driver_code.upper(), '#00D2BE')
        
        lap1_time = float(lap1['LapTime'].total_seconds()) if pd.notna(lap1['LapTime']) else 0.0
        lap2_time = float(lap2['LapTime'].total_seconds()) if pd.notna(lap2['LapTime']) else 0.0
        
        team1 = str(lap1['Team']) if 'Team' in lap1.index and pd.notna(lap1['Team']) else 'Unknown'
        team2 = str(lap2['Team']) if 'Team' in lap2.index and pd.notna(lap2['Team']) else 'Unknown'
        
        result = {
            'driver1Telemetry': driver1_telemetry,
            'driver2Telemetry': driver2_telemetry,
            'driver1Info': {
                'code': driver1.upper(),
                'team': team1,
                'color': get_team_color(driver1)
            },
            'driver2Info': {
                'code': driver2.upper(),
                'team': team2,
                'color': get_team_color(driver2)
            },
            'lapTime1': lap1_time,
            'lapTime2': lap2_time,
            'sector1Time1': sector1_time1,
            'sector2Time1': sector2_time1,
            'sector3Time1': sector3_time1,
            'sector1Time2': sector1_time2,
            'sector2Time2': sector2_time2,
            'sector3Time2': sector3_time2,
            'trackPath': svg_path,
            'viewBox': {
                'minX': 0,
                'minY': 0,
                'width': 1000,
                'height': 1000
            }
        }
        
        api_cache.set(result, *cache_key_parts)
        log_success("/api/animation-optimized", cache_hit=False)
        return result
        
    except Exception as e:
        log_error("/api/animation-optimized", e)
        raise handle_fastf1_error(e, f"Animation: {driver1} vs {driver2}, {year} GP{gp_round} Qualifying")


@app.get("/api/animation-race-full/{year}/{gp_round}/{driver1}/{driver2}")
@limiter.limit("10/minute")
async def get_animation_race_full(request: Request, year: int, gp_round: int, driver1: str, driver2: str):
    try:
        session = fastf1.get_session(year, gp_round, 'R')
        await asyncio.to_thread(session.load)
        
        laps1 = session.laps.pick_drivers(driver1)
        laps2 = session.laps.pick_drivers(driver2)
        
        if laps1.empty or laps2.empty:
            raise HTTPException(status_code=404, detail="No laps found for drivers")
        
        # ✅ EXTRACTION DES TEMPS DE SECTEUR (tour le plus rapide de chaque pilote)
        fastest_lap1 = laps1.pick_fastest()
        fastest_lap2 = laps2.pick_fastest()
        
        sector1_time1 = float(fastest_lap1['Sector1Time'].total_seconds()) if pd.notna(fastest_lap1['Sector1Time']) else None
        sector2_time1 = float(fastest_lap1['Sector2Time'].total_seconds()) if pd.notna(fastest_lap1['Sector2Time']) else None
        sector3_time1 = float(fastest_lap1['Sector3Time'].total_seconds()) if pd.notna(fastest_lap1['Sector3Time']) else None
        
        sector1_time2 = float(fastest_lap2['Sector1Time'].total_seconds()) if pd.notna(fastest_lap2['Sector1Time']) else None
        sector2_time2 = float(fastest_lap2['Sector2Time'].total_seconds()) if pd.notna(fastest_lap2['Sector2Time']) else None
        sector3_time2 = float(fastest_lap2['Sector3Time'].total_seconds()) if pd.notna(fastest_lap2['Sector3Time']) else None
        
        all_telemetry_driver1 = []
        all_telemetry_driver2 = []
        cumulative_time1 = 0
        cumulative_time2 = 0
        
        max_laps = min(len(laps1), len(laps2))
        
        for lap_number in range(1, max_laps + 1):
            lap1 = laps1[laps1['LapNumber'] == lap_number].iloc[0] if len(laps1[laps1['LapNumber'] == lap_number]) > 0 else None
            lap2 = laps2[laps2['LapNumber'] == lap_number].iloc[0] if len(laps2[laps2['LapNumber'] == lap_number]) > 0 else None
            
            if lap1 is None or lap2 is None:
                continue
            
            try:
                tel1 = lap1.get_telemetry()
                tel2 = lap2.get_telemetry()
                pos1 = lap1.get_pos_data()
                pos2 = lap2.get_pos_data()
                
                tel1 = tel1.add_distance()
                tel2 = tel2.add_distance()
                
                tel1 = tel1.reset_index(drop=True)
                tel2 = tel2.reset_index(drop=True)
                pos1 = pos1.reset_index(drop=True)
                pos2 = pos2.reset_index(drop=True)
                
                min_points1 = min(len(tel1), len(pos1))
                min_points2 = min(len(tel2), len(pos2))
                
                step1 = max(1, min_points1 // 150)
                step2 = max(1, min_points2 // 150)
                
                for i in range(0, min_points1, step1):
                    if i >= len(tel1) or i >= len(pos1):
                        continue
                    
                    point1 = tel1.iloc[i]
                    pos_point1 = pos1.iloc[i]
                    
                    relative_time = cumulative_time1 + (i / min_points1) * float(lap1['LapTime'].total_seconds() if lap1['LapTime'] is not None else 90)
                    
                    all_telemetry_driver1.append({
                        'lapNumber': int(lap_number),
                        'time': relative_time,
                        'x': float(pos_point1['X']),
                        'y': float(pos_point1['Y']),
                        'speed': float(point1['Speed']) if point1['Speed'] is not None else 0.0,
                        'gear': int(point1['nGear']) if point1['nGear'] is not None else 0,
                        'throttle': float(point1['Throttle']) if point1['Throttle'] is not None else 0.0,
                        'brake': bool(point1['Brake']) if point1['Brake'] is not None else False,
                    })
                
                for i in range(0, min_points2, step2):
                    if i >= len(tel2) or i >= len(pos2):
                        continue
                    
                    point2 = tel2.iloc[i]
                    pos_point2 = pos2.iloc[i]
                    
                    relative_time = cumulative_time2 + (i / min_points2) * float(lap2['LapTime'].total_seconds() if lap2['LapTime'] is not None else 90)
                    
                    all_telemetry_driver2.append({
                        'lapNumber': int(lap_number),
                        'time': relative_time,
                        'x': float(pos_point2['X']),
                        'y': float(pos_point2['Y']),
                        'speed': float(point2['Speed']) if point2['Speed'] is not None else 0.0,
                        'gear': int(point2['nGear']) if point2['nGear'] is not None else 0,
                        'throttle': float(point2['Throttle']) if point2['Throttle'] is not None else 0.0,
                        'brake': bool(point2['Brake']) if point2['Brake'] is not None else False,
                    })
                
                cumulative_time1 += float(lap1['LapTime'].total_seconds() if lap1['LapTime'] is not None else 90)
                cumulative_time2 += float(lap2['LapTime'].total_seconds() if lap2['LapTime'] is not None else 90)
                
            except Exception as e:
                logger.error(f"Error processing lap {lap_number}: {str(e)}")
                continue
        
        max_time = max(
            all_telemetry_driver1[-1]['time'] if all_telemetry_driver1 else 0,
            all_telemetry_driver2[-1]['time'] if all_telemetry_driver2 else 0
        )
        
        animation_data = []
        time_step = 0.2
        
        idx1 = 0
        idx2 = 0
        
        for t in range(0, int(max_time * 5)):
            current_time = t * time_step
            
            while idx1 < len(all_telemetry_driver1) - 1 and all_telemetry_driver1[idx1 + 1]['time'] <= current_time:
                idx1 += 1
            
            while idx2 < len(all_telemetry_driver2) - 1 and all_telemetry_driver2[idx2 + 1]['time'] <= current_time:
                idx2 += 1
            
            if idx1 >= len(all_telemetry_driver1) or idx2 >= len(all_telemetry_driver2):
                break
            
            data1 = all_telemetry_driver1[idx1]
            data2 = all_telemetry_driver2[idx2]
            
            animation_data.append({
                'lapNumber': max(data1['lapNumber'], data2['lapNumber']),
                'time': current_time,
                'driver1': {
                    'x': data1['x'],
                    'y': data1['y'],
                    'speed': data1['speed'],
                    'gear': data1['gear'],
                    'throttle': data1['throttle'],
                    'brake': data1['brake'],
                },
                'driver2': {
                    'x': data2['x'],
                    'y': data2['y'],
                    'speed': data2['speed'],
                    'gear': data2['gear'],
                    'throttle': data2['throttle'],
                    'brake': data2['brake'],
                }
            })
        
        return {
            'animation': animation_data,
            'totalLaps': max_laps,
            'driver1': driver1,
            'driver2': driver2,
            'totalTime': max_time,
            # ✅ NOUVEAUX CHAMPS - TEMPS DE SECTEUR RÉELS
            'sector1Time1': sector1_time1,
            'sector2Time1': sector2_time1,
            'sector3Time1': sector3_time1,
            'sector1Time2': sector1_time2,
            'sector2Time2': sector2_time2,
            'sector3Time2': sector3_time2,
        }
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/race-data/{year}/{gp_round}")
async def get_race_data(year: int, gp_round: int):
    try:

        
        session = fastf1.get_session(year, gp_round, 'R')
        await asyncio.to_thread(session.load)
        
        laps = session.laps
        
        race_data = []
        max_lap = int(laps['LapNumber'].max())
        
        for lap_num in range(1, max_lap + 1):
            lap_data = laps[laps['LapNumber'] == lap_num]
            
            positions = []
            for _, lap in lap_data.iterrows():
                try:
                    lap_time_value = None
                    if lap['LapTime'] is not None:
                        lap_time_seconds = float(lap['LapTime'].total_seconds())
                        if not math.isnan(lap_time_seconds) and not math.isinf(lap_time_seconds):
                            lap_time_value = lap_time_seconds
                    
                    positions.append({
                        'driver': str(lap['Driver']),
                        'team': str(lap['Team']) if 'Team' in lap else 'Unknown',
                        'position': int(lap['Position']) if lap['Position'] is not None and not math.isnan(lap['Position']) else 99,
                        'lapTime': lap_time_value,
                        'compound': str(lap['Compound']) if 'Compound' in lap else 'UNKNOWN',
                        'tyreLife': int(lap['TyreLife']) if lap['TyreLife'] is not None and not math.isnan(lap['TyreLife']) else 0,
                        'stint': int(lap['Stint']) if 'Stint' in lap and not math.isnan(lap['Stint']) else 1,
                        'pitOutTime': bool(lap['PitOutTime']) if 'PitOutTime' in lap and lap['PitOutTime'] is not None else False,
                        'pitInTime': bool(lap['PitInTime']) if 'PitInTime' in lap and lap['PitInTime'] is not None else False,
                    })
                except Exception:
                    continue
            
            positions.sort(key=lambda x: x['position'])
            
            race_data.append({
                'lapNumber': lap_num,
                'positions': positions
            })
        
        return {
            'raceData': race_data,
            'totalLaps': max_lap,
            'circuitName': session.event['EventName'],
            'country': session.event['Country']
        }
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/pit-stops/{year}/{gp_round}")
async def get_pit_stops(year: int, gp_round: int):
    try:

        
        session = fastf1.get_session(year, gp_round, 'R')
        await asyncio.to_thread(session.load)
        
        laps = session.laps
        
        pit_stops = []
        
        for driver in laps['Driver'].unique():
            driver_laps = laps[laps['Driver'] == driver]
            
            for _, lap in driver_laps.iterrows():
                if lap['PitOutTime'] is not None:
                    try:
                        pit_duration = None
                        if lap['PitInTime'] is not None and lap['PitOutTime'] is not None:
                            duration_seconds = float((lap['PitOutTime'] - lap['PitInTime']).total_seconds())
                            if not math.isnan(duration_seconds) and not math.isinf(duration_seconds):
                                pit_duration = duration_seconds
                        
                        pit_stops.append({
                            'driver': str(lap['Driver']),
                            'team': str(lap['Team']) if 'Team' in lap else 'Unknown',
                            'lap': int(lap['LapNumber']),
                            'duration': pit_duration,
                            'compound': str(lap['Compound']) if 'Compound' in lap else 'UNKNOWN',
                            'tyreLife': int(lap['TyreLife']) if lap['TyreLife'] is not None else 0,
                            'stint': int(lap['Stint']) if 'Stint' in lap else 1,
                        })
                    except Exception:
                        continue
        
        pit_stops.sort(key=lambda x: x['lap'])
        
        return {'pitStops': pit_stops}
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/race-events/{year}/{gp_round}")
async def get_race_events(year: int, gp_round: int):
    try:

        
        session = fastf1.get_session(year, gp_round, 'R')
        await asyncio.to_thread(session.load)
        
        events = []
        
        if hasattr(session, 'laps') and session.laps is not None:
            laps = session.laps
            
            for lap_num in range(2, int(laps['LapNumber'].max()) + 1):
                prev_lap = laps[laps['LapNumber'] == lap_num - 1]
                curr_lap = laps[laps['LapNumber'] == lap_num]
                
                if not prev_lap.empty and not curr_lap.empty:
                    prev_leader = prev_lap[prev_lap['Position'] == 1]
                    curr_leader = curr_lap[curr_lap['Position'] == 1]
                    
                    if not prev_leader.empty and not curr_leader.empty:
                        prev_driver = prev_leader.iloc[0]['Driver']
                        curr_driver = curr_leader.iloc[0]['Driver']
                        
                        if prev_driver != curr_driver:
                            events.append({
                                'lap': lap_num,
                                'type': 'LEAD_CHANGE',
                                'description': f'{curr_driver} takes the lead from {prev_driver}',
                                'driver': str(curr_driver),
                                'severity': 'high'
                            })
            
            max_lap = int(laps['LapNumber'].max())
            for driver in laps['Driver'].unique():
                driver_laps = laps[laps['Driver'] == driver]
                last_lap = int(driver_laps['LapNumber'].max())
                
                if last_lap < max_lap - 2:
                    events.append({
                        'lap': last_lap,
                        'type': 'DNF',
                        'description': f'{driver} retired from the race',
                        'driver': str(driver),
                        'severity': 'critical'
                    })
            
            fastest_laps_by_lap = {}
            for lap_num in range(1, int(laps['LapNumber'].max()) + 1):
                lap_data = laps[laps['LapNumber'] == lap_num]
                valid_laps = lap_data[lap_data['LapTime'].notna()]
                
                if not valid_laps.empty:
                    fastest = valid_laps.loc[valid_laps['LapTime'].idxmin()]
                    fastest_laps_by_lap[lap_num] = {
                        'driver': str(fastest['Driver']),
                        'time': float(fastest['LapTime'].total_seconds())
                    }
            
            if fastest_laps_by_lap:
                overall_fastest_lap = min(fastest_laps_by_lap.items(), key=lambda x: x[1]['time'])
                events.append({
                    'lap': overall_fastest_lap[0],
                    'type': 'FASTEST_LAP',
                    'description': f'{overall_fastest_lap[1]["driver"]} sets fastest lap: {overall_fastest_lap[1]["time"]:.3f}s',
                    'driver': overall_fastest_lap[1]['driver'],
                    'severity': 'info'
                })
            
            for lap_num in range(2, int(laps['LapNumber'].max()) + 1):
                prev_lap = laps[laps['LapNumber'] == lap_num - 1]
                curr_lap = laps[laps['LapNumber'] == lap_num]
                
                for driver in laps['Driver'].unique():
                    prev_pos = prev_lap[prev_lap['Driver'] == driver]
                    curr_pos = curr_lap[curr_lap['Driver'] == driver]
                    
                    if not prev_pos.empty and not curr_pos.empty:
                        prev_position = prev_pos.iloc[0]['Position']
                        curr_position = curr_pos.iloc[0]['Position']
                        
                        if not math.isnan(prev_position) and not math.isnan(curr_position):
                            prev_position = int(prev_position)
                            curr_position = int(curr_position)
                            
                            if prev_position - curr_position >= 3:
                                events.append({
                                    'lap': lap_num,
                                    'type': 'OVERTAKE',
                                    'description': f'{driver} gains {prev_position - curr_position} positions (P{prev_position} → P{curr_position})',
                                    'driver': str(driver),
                                    'severity': 'medium'
                                })
        
        events.sort(key=lambda x: x['lap'])
        
        return {'events': events}
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/position-evolution/{year}/{gp_round}")
async def get_position_evolution(year: int, gp_round: int):
    try:

        
        # Load race session
        session = fastf1.get_session(year, gp_round, 'R')
        await asyncio.to_thread(session.load)
        
        laps = session.laps
        max_lap = int(laps['LapNumber'].max())
        
        # ✅ Get ALL drivers who participated in the race with their teams
        all_drivers = laps['Driver'].unique().tolist()
        
        # Get driver to team mapping
        driver_teams = {}
        for driver in all_drivers:
            driver_laps = laps[laps['Driver'] == driver]
            if not driver_laps.empty:
                driver_teams[str(driver)] = str(driver_laps.iloc[0]['Team'])
        
        evolution_data = []
        
        for lap_num in range(1, max_lap + 1):
            lap_data = laps[laps['LapNumber'] == lap_num]
            lap_positions = {'lap': lap_num}
            
            # Include all drivers for this lap
            for driver in all_drivers:
                driver_lap = lap_data[lap_data['Driver'] == driver]
                if not driver_lap.empty:
                    position = driver_lap.iloc[0]['Position']
                    if not math.isnan(position):
                        lap_positions[str(driver)] = int(position)
            
            evolution_data.append(lap_positions)
        
        return {
            'evolution': evolution_data,
            'drivers': [str(d) for d in all_drivers],
            'teams': driver_teams
        }
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/strategy-comparison/{year}/{gp_round}")
async def get_strategy_comparison(year: int, gp_round: int):
    try:
        session = fastf1.get_session(year, gp_round, 'R')
        await asyncio.to_thread(session.load)
        
        laps = session.laps
        strategies = []
        
        for driver in laps['Driver'].unique():
            driver_laps = laps[laps['Driver'] == driver]
            stints = []
            
            current_stint = None
            for _, lap in driver_laps.iterrows():
                stint_num = int(lap['Stint']) if 'Stint' in lap and lap['Stint'] is not None else 1
                compound = str(lap['Compound']) if 'Compound' in lap else 'UNKNOWN'
                
                if current_stint is None or current_stint['stint'] != stint_num:
                    if current_stint is not None:
                        stints.append(current_stint)
                    
                    current_stint = {
                        'stint': stint_num,
                        'compound': compound,
                        'startLap': int(lap['LapNumber']),
                        'laps': 0
                    }
                
                current_stint['laps'] += 1
            
            if current_stint is not None:
                stints.append(current_stint)
            
            strategies.append({
                'driver': str(driver),
                'team': str(driver_laps.iloc[0]['Team']) if 'Team' in driver_laps.iloc[0] else 'Unknown',
                'stints': stints,
                'totalStops': len(stints) - 1
            })
        
        return {'strategies': strategies}
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/championship/{year}/drivers")
async def get_driver_standings(year: int):
    try:
        url = f"http://api.jolpi.ca/ergast/f1/{year}/driverStandings.json"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        standings_list = data['MRData']['StandingsTable']['StandingsLists']
        
        if not standings_list:
            return {'standings': []}
        
        drivers = standings_list[-1]['DriverStandings']
        
        standings = []
        for driver in drivers:
            standings.append({
                'position': int(driver['position']),
                'driver': f"{driver['Driver']['givenName']} {driver['Driver']['familyName']}",
                'code': driver['Driver']['code'] if 'code' in driver['Driver'] else driver['Driver']['familyName'][:3].upper(),
                'team': driver['Constructors'][0]['name'],
                'points': float(driver['points']),
                'wins': int(driver['wins'])
            })
        
        return {'standings': standings}
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/championship/{year}/constructors")
async def get_constructor_standings(year: int):
    try:
        url = f"http://api.jolpi.ca/ergast/f1/{year}/constructorStandings.json"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        standings_list = data['MRData']['StandingsTable']['StandingsLists']
        
        if not standings_list:
            return {'standings': []}
        
        constructors = standings_list[-1]['ConstructorStandings']
        
        standings = []
        for constructor in constructors:
            standings.append({
                'position': int(constructor['position']),
                'team': constructor['Constructor']['name'],
                'points': float(constructor['points']),
                'wins': int(constructor['wins'])
            })
        
        return {'standings': standings}
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/championship/{year}/{gp_round}/results")
async def get_race_results(year: int, gp_round: int):
    try:
        url = f"http://api.jolpi.ca/ergast/f1/{year}/{gp_round}/results.json"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        races = data['MRData']['RaceTable']['Races']
        
        if not races:
            return {'results': []}
        
        results_data = races[0]['Results']
        
        results = []
        for result in results_data:
            lap_time = None
            if 'Time' in result:
                lap_time = result['Time']['time']
            
            results.append({
                'position': int(result['position']),
                'driver': f"{result['Driver']['givenName']} {result['Driver']['familyName']}",
                'code': result['Driver']['code'] if 'code' in result['Driver'] else result['Driver']['familyName'][:3].upper(),
                'team': result['Constructor']['name'],
                'grid': int(result['grid']),
                'points': float(result['points']),
                'status': result['status'],
                'time': lap_time
            })
        
        return {
            'results': results,
            'raceName': races[0]['raceName'],
            'circuitName': races[0]['Circuit']['circuitName'],
            'date': races[0]['date']
        }
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/championship/{year}/{gp_round}/standings")
async def get_standings_after_race(year: int, gp_round: int):
    try:
        driver_url = f"http://api.jolpi.ca/ergast/f1/{year}/{gp_round}/driverStandings.json"
        constructor_url = f"http://api.jolpi.ca/ergast/f1/{year}/{gp_round}/constructorStandings.json"
        
        driver_response = requests.get(driver_url, timeout=10)
        constructor_response = requests.get(constructor_url, timeout=10)
        
        driver_data = driver_response.json()
        constructor_data = constructor_response.json()
        
        driver_standings_list = driver_data['MRData']['StandingsTable']['StandingsLists']
        constructor_standings_list = constructor_data['MRData']['StandingsTable']['StandingsLists']
        
        drivers = []
        constructors = []
        
        if driver_standings_list:
            for driver in driver_standings_list[0]['DriverStandings']:
                drivers.append({
                    'position': int(driver['position']),
                    'driver': f"{driver['Driver']['givenName']} {driver['Driver']['familyName']}",
                    'code': driver['Driver']['code'] if 'code' in driver['Driver'] else driver['Driver']['familyName'][:3].upper(),
                    'team': driver['Constructors'][0]['name'],
                    'points': float(driver['points']),
                    'wins': int(driver['wins'])
                })
        
        if constructor_standings_list:
            for constructor in constructor_standings_list[0]['ConstructorStandings']:
                constructors.append({
                    'position': int(constructor['position']),
                    'team': constructor['Constructor']['name'],
                    'points': float(constructor['points']),
                    'wins': int(constructor['wins'])
                })
        
        return {
            'drivers': drivers,
            'constructors': constructors
        }
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/circuits/{year}")
async def get_circuits(year: int):
    try:
        schedule = fastf1.get_event_schedule(year)
        circuits = []
        
        for _, event in schedule.iterrows():
            circuits.append({
                'round': int(event['RoundNumber']),
                'name': str(event['EventName']),
                'location': str(event['Location']),
                'country': str(event['Country']),
                'date': str(event['EventDate'].date()) if 'EventDate' in event else None,
            })
        
        return {'circuits': circuits}
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/racing-line/{year}/{gp_round}/{session_type}/{driver}")
async def get_racing_line(year: int, gp_round: int, session_type: str, driver: str):
    try:
        # Charger la session
        session = fastf1.get_session(year, gp_round, session_type)
        await asyncio.to_thread(session.load)
        
        # Récupérer le pilote
        driver_laps = session.laps.pick_driver(driver)
        
        if driver_laps.empty:
            raise HTTPException(status_code=404, detail=f"No data for driver {driver}")
        
        # Prendre le meilleur tour
        fastest_lap = driver_laps.pick_fastest()
        
        # Récupérer la télémétrie avec positions GPS
        telemetry = fastest_lap.get_telemetry()
        
        if telemetry.empty:
            raise HTTPException(status_code=404, detail="No telemetry data available")
        
        # Extraire les données GPS
        gps_data = []
        for idx, row in telemetry.iterrows():
            gps_data.append({
                "x": float(row['X']) if pd.notna(row['X']) else 0,
                "y": float(row['Y']) if pd.notna(row['Y']) else 0,
                "speed": float(row['Speed']) if pd.notna(row['Speed']) else 0,
                "distance": float(row['Distance']) if pd.notna(row['Distance']) else 0
            })
        
        # Infos du tour
        lap_info = {
            "driver": driver,
            "lap_time": str(fastest_lap['LapTime']),
            "lap_number": int(fastest_lap['LapNumber']),
            "compound": fastest_lap['Compound']
        }
        
        return {
            "lap_info": lap_info,
            "gps_data": gps_data,
            "total_points": len(gps_data)
        }
        
    except Exception as e:
        logger.error(f"Error in racing line: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
