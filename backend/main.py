from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import fastf1
import pandas as pd
import requests
from app.utils.cache import cache
from app.utils.error_handler import handle_fastf1_error, log_request, log_success, log_error

# Créer l'app FastAPI
app = FastAPI()

# Configuration CORS - OUVERT TEMPORAIREMENT POUR DEBUG
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Accepte tous les domaines
    allow_credentials=False,  # DOIT être False avec origins=*
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache FastF1
cache_dir = 'cache'
fastf1.Cache.enable_cache(cache_dir)
cache.clear_old()


@app.get("/api/grands-prix/{year}")
async def get_grands_prix(year: int):
    try:
        schedule = fastf1.get_event_schedule(year)
        
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
                "official_name": event['OfficialEventName'],
                "date": event['EventDate'].strftime('%Y-%m-%d')
            }
            grands_prix.append(gp_info)
        
        return {"grands_prix": grands_prix}
        
    except Exception as e:
        print(f"Error fetching GPs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/drivers/{year}/{gp_round}/{session_type}")
async def get_drivers(year: int, gp_round: int, session_type: str):
    try:
        # Log de la requête
        log_request("/api/drivers", {"year": year, "gp_round": gp_round, "session_type": session_type})
        
        # Vérifier le cache d'abord
        cached_data = cache.get('drivers', year, gp_round, session_type)
        if cached_data:
            log_success("/api/drivers", cache_hit=True)
            return cached_data
        
        session = fastf1.get_session(year, gp_round, session_type)
        session.load()
        
        drivers = []
        for driver_code in session.drivers:
            driver_info = session.get_driver(driver_code)
            drivers.append({
                'abbreviation': str(driver_info['Abbreviation']),
                'number': str(driver_info['DriverNumber']),
                'team': str(driver_info['TeamName']),
                'fullName': str(driver_info['FullName']) if 'FullName' in driver_info else str(driver_info['Abbreviation'])
            })
        
        # Sauvegarder dans le cache
        cache.set(drivers, 'drivers', year, gp_round, session_type)
        log_success("/api/drivers", cache_hit=False)
        return drivers
        
    except Exception as e:
        log_error("/api/drivers", e)
        raise handle_fastf1_error(e, f"Année: {year}, GP: {gp_round}, Session: {session_type}")

@app.get("/api/telemetry/{year}/{gp_round}/{session_type}/{driver1}/{driver2}")
async def get_telemetry_comparison(year: int, gp_round: int, session_type: str, driver1: str, driver2: str):
    try:
        log_request("/api/telemetry", {
            "year": year,
            "gp_round": gp_round,
            "session_type": session_type,
            "driver1": driver1,
            "driver2": driver2
        })
        
        cached_data = cache.get('telemetry', year, gp_round, session_type, driver1, driver2)
        if cached_data:
            log_success("/api/telemetry", cache_hit=True)
            return cached_data
        
        session = fastf1.get_session(year, gp_round, session_type)
        session.load()
        
        lap1 = session.laps.pick_drivers(driver1).pick_fastest()
        lap2 = session.laps.pick_drivers(driver2).pick_fastest()
        
        if lap1 is None or lap2 is None:
            missing_driver = driver1 if lap1 is None else driver2
            raise Exception(f"Driver {missing_driver} not found or no valid laps available")
        
        tel1 = lap1.get_telemetry()
        tel2 = lap2.get_telemetry()
        tel1 = tel1.add_distance()
        tel2 = tel2.add_distance()
        
        telemetry_data = []
        min_length = min(len(tel1), len(tel2))
        
        for i in range(0, min_length, max(1, min_length // 500)):
            # ✅ CORRECTION : Renvoyer les vraies coordonnées GPS ou None
            x_val = tel1['X'].iloc[i]
            y_val = tel1['Y'].iloc[i]
            
            telemetry_data.append({
                'distance': float(tel1.iloc[i]['Distance']),
                'speed1': float(tel1.iloc[i]['Speed']) if tel1.iloc[i]['Speed'] is not None else 0.0,
                'speed2': float(tel2.iloc[i]['Speed']) if tel2.iloc[i]['Speed'] is not None else 0.0,
                'throttle1': float(tel1.iloc[i]['Throttle']) if tel1.iloc[i]['Throttle'] is not None else 0.0,
                'throttle2': float(tel2.iloc[i]['Throttle']) if tel2.iloc[i]['Throttle'] is not None else 0.0,
                'brake1': bool(tel1.iloc[i]['Brake']) if tel1.iloc[i]['Brake'] is not None else False,
                'brake2': bool(tel2.iloc[i]['Brake']) if tel2.iloc[i]['Brake'] is not None else False,
                'gear1': int(tel1.iloc[i]['nGear']) if tel1.iloc[i]['nGear'] is not None else 0,
                'gear2': int(tel2.iloc[i]['nGear']) if tel2.iloc[i]['nGear'] is not None else 0,
                'drs1': int(tel1.iloc[i]['DRS']) if tel1.iloc[i]['DRS'] is not None else 0,
                'drs2': int(tel2.iloc[i]['DRS']) if tel2.iloc[i]['DRS'] is not None else 0,
                'x': float(x_val) if pd.notna(x_val) else None,  # ← None au lieu de 0.0
                'y': float(y_val) if pd.notna(y_val) else None   # ← None au lieu de 0.0
            })
        
        result = {
            'telemetry': telemetry_data,
            'lapTime1': float(lap1['LapTime'].total_seconds()),
            'lapTime2': float(lap2['LapTime'].total_seconds()),
            'driver1': driver1,
            'driver2': driver2
        }
        
        cache.set(result, 'telemetry', year, gp_round, session_type, driver1, driver2)
        log_success("/api/telemetry", cache_hit=False)
        return result
        
    except Exception as e:
        log_error("/api/telemetry", e)
        raise handle_fastf1_error(e, f"Pilotes: {driver1} vs {driver2}, {year} GP{gp_round} {session_type}")



@app.get("/api/animation-enhanced/{year}/{gp_round}/{session_type}/{driver1}/{driver2}")
async def get_animation_enhanced(year: int, gp_round: int, session_type: str, driver1: str, driver2: str):
    try:
        session = fastf1.get_session(year, gp_round, session_type)
        session.load()
        
        lap1 = session.laps.pick_drivers(driver1).pick_fastest()
        lap2 = session.laps.pick_drivers(driver2).pick_fastest()
        
        if lap1 is None or lap2 is None:
            raise HTTPException(status_code=404, detail="Fastest laps not found")
        
        # ✅ EXTRACTION DES TEMPS DE SECTEUR
        sector1_time1 = float(lap1['Sector1Time'].total_seconds()) if pd.notna(lap1['Sector1Time']) else None
        sector2_time1 = float(lap1['Sector2Time'].total_seconds()) if pd.notna(lap1['Sector2Time']) else None
        sector3_time1 = float(lap1['Sector3Time'].total_seconds()) if pd.notna(lap1['Sector3Time']) else None
        
        sector1_time2 = float(lap2['Sector1Time'].total_seconds()) if pd.notna(lap2['Sector1Time']) else None
        sector2_time2 = float(lap2['Sector2Time'].total_seconds()) if pd.notna(lap2['Sector2Time']) else None
        sector3_time2 = float(lap2['Sector3Time'].total_seconds()) if pd.notna(lap2['Sector3Time']) else None
        
        tel1 = lap1.get_telemetry()
        tel2 = lap2.get_telemetry()
        
        pos1 = lap1.get_pos_data()
        pos2 = lap2.get_pos_data()
        
        tel1 = tel1.add_distance()
        tel2 = tel2.add_distance()
        
        # Aligner les distances de départ
        start_distance1 = float(tel1['Distance'].min())
        start_distance2 = float(tel2['Distance'].min())
        start_distance = max(start_distance1, start_distance2)
        
        tel1 = tel1[tel1['Distance'] >= start_distance].reset_index(drop=True)
        tel2 = tel2[tel2['Distance'] >= start_distance].reset_index(drop=True)
        pos1 = pos1.reset_index(drop=True)
        pos2 = pos2.reset_index(drop=True)
        
        total_distance = float(min(tel1['Distance'].max(), tel2['Distance'].max()))
        
        animation_data = []
        
        # ✅ SYNCHRONISATION PAR INDEX (même distance) avec calcul du gap réel
        min_length = min(len(tel1), len(tel2), len(pos1), len(pos2))
        step = max(1, min_length // 500)  # ~500 points pour l'animation
        
        for i in range(0, min_length, step):
            try:
                if i >= len(tel1) or i >= len(tel2) or i >= len(pos1) or i >= len(pos2):
                    continue
                
                point1 = tel1.iloc[i]
                point2 = tel2.iloc[i]
                pos_point1 = pos1.iloc[i]
                pos_point2 = pos2.iloc[i]
                
                # ✅ GAP RÉEL = différence de temps à la même distance
                # Négatif = driver1 plus rapide (devant), Positif = driver2 plus rapide (devant)
                time_diff = float(point1['Time'].total_seconds() - point2['Time'].total_seconds())
                
                animation_data.append({
                    'distance': float(point1['Distance'] - start_distance),
                    'driver1': {
                        'x': float(pos_point1['X']),
                        'y': float(pos_point1['Y']),
                        'speed': float(point1['Speed']) if point1['Speed'] is not None else 0.0,
                        'throttle': float(point1['Throttle']) if point1['Throttle'] is not None else 0.0,
                        'brake': bool(point1['Brake']) if point1['Brake'] is not None else False,
                        'gear': int(point1['nGear']) if point1['nGear'] is not None else 0,
                        'drs': int(point1['DRS']) if point1['DRS'] is not None else 0,
                        'time': float(point1['Time'].total_seconds())
                    },
                    'driver2': {
                        'x': float(pos_point2['X']),
                        'y': float(pos_point2['Y']),
                        'speed': float(point2['Speed']) if point2['Speed'] is not None else 0.0,
                        'throttle': float(point2['Throttle']) if point2['Throttle'] is not None else 0.0,
                        'brake': bool(point2['Brake']) if point2['Brake'] is not None else False,
                        'gear': int(point2['nGear']) if point2['nGear'] is not None else 0,
                        'drs': int(point2['DRS']) if point2['DRS'] is not None else 0,
                        'time': float(point2['Time'].total_seconds())
                    },
                    'gap': time_diff  # Ce gap fluctue naturellement !
                })
            except Exception:
                continue
        
        lap1_time = float(lap1['LapTime'].total_seconds()) if lap1['LapTime'] is not None else 0.0
        lap2_time = float(lap2['LapTime'].total_seconds()) if lap2['LapTime'] is not None else 0.0
        
        return {
            'animation': animation_data,
            'lapTime1': lap1_time,
            'lapTime2': lap2_time,
            'totalDistance': total_distance - start_distance,
            'driver1Info': {
                'code': driver1,
                'team': str(lap1['Team']) if 'Team' in lap1 else 'Unknown',
                'compound': str(lap1['Compound']) if 'Compound' in lap1 else 'Unknown'
            },
            'driver2Info': {
                'code': driver2,
                'team': str(lap2['Team']) if 'Team' in lap2 else 'Unknown',
                'compound': str(lap2['Compound']) if 'Compound' in lap2 else 'Unknown'
            },
            'sector1Time1': sector1_time1,
            'sector2Time1': sector2_time1,
            'sector3Time1': sector3_time1,
            'sector1Time2': sector1_time2,
            'sector2Time2': sector2_time2,
            'sector3Time2': sector3_time2,
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))




@app.get("/api/animation-race-full/{year}/{gp_round}/{driver1}/{driver2}")
async def get_animation_race_full(year: int, gp_round: int, driver1: str, driver2: str):
    try:
        session = fastf1.get_session(year, gp_round, 'R')
        session.load()
        
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
                print(f"Error processing lap {lap_number}: {str(e)}")
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/race-data/{year}/{gp_round}")
async def get_race_data(year: int, gp_round: int):
    try:
        import math
        
        session = fastf1.get_session(year, gp_round, 'R')
        session.load()
        
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/pit-stops/{year}/{gp_round}")
async def get_pit_stops(year: int, gp_round: int):
    try:
        import math
        
        session = fastf1.get_session(year, gp_round, 'R')
        session.load()
        
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/race-events/{year}/{gp_round}")
async def get_race_events(year: int, gp_round: int):
    try:
        import math
        
        session = fastf1.get_session(year, gp_round, 'R')
        session.load()
        
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/position-evolution/{year}/{gp_round}")
async def get_position_evolution(year: int, gp_round: int):
    try:
        import math
        
        # Load race session
        session = fastf1.get_session(year, gp_round, 'R')
        session.load()
        
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/strategy-comparison/{year}/{gp_round}")
async def get_strategy_comparison(year: int, gp_round: int):
    try:
        session = fastf1.get_session(year, gp_round, 'R')
        session.load()
        
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/race-pace/{year}/{gp_round}/{driver}")
async def get_race_pace(year: int, gp_round: int, driver: str):
    try:
        import math
        
        session = fastf1.get_session(year, gp_round, 'R')
        session.load()
        
        driver_laps = session.laps.pick_drivers(driver)
        
        pace_data = []
        for _, lap in driver_laps.iterrows():
            lap_time = None
            if lap['LapTime'] is not None:
                lap_time_seconds = float(lap['LapTime'].total_seconds())
                if not math.isnan(lap_time_seconds) and not math.isinf(lap_time_seconds):
                    lap_time = lap_time_seconds
            
            pace_data.append({
                'lapNumber': int(lap['LapNumber']),
                'lapTime': lap_time,
                'compound': str(lap['Compound']) if 'Compound' in lap else 'UNKNOWN',
                'tyreLife': int(lap['TyreLife']) if lap['TyreLife'] is not None and not math.isnan(lap['TyreLife']) else 0,
                'stint': int(lap['Stint']) if 'Stint' in lap and not math.isnan(lap['Stint']) else 1,
                'position': int(lap['Position']) if lap['Position'] is not None and not math.isnan(lap['Position']) else 99,
                'pitOutTime': bool(lap['PitOutTime']) if 'PitOutTime' in lap and lap['PitOutTime'] is not None else False,
                'pitInTime': bool(lap['PitInTime']) if 'PitInTime' in lap and lap['PitInTime'] is not None else False,
            })
        
        return {
            'driver': driver,
            'paceData': pace_data
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/multi-driver-pace/{year}/{gp_round}/{session_type}")
async def get_multi_driver_pace(year: int, gp_round: int, session_type: str, drivers: str):
    try:
        import math
        
        driver_list = drivers.split(',')
        session = fastf1.get_session(year, gp_round, session_type)
        session.load()
        
        all_drivers_data = {}
        
        for driver in driver_list:
            driver = driver.strip()
            driver_laps = session.laps.pick_drivers(driver)
            
            pace_data = []
            for _, lap in driver_laps.iterrows():
                lap_time = None
                if lap['LapTime'] is not None:
                    lap_time_seconds = float(lap['LapTime'].total_seconds())
                    if not math.isnan(lap_time_seconds) and not math.isinf(lap_time_seconds):
                        lap_time = lap_time_seconds
                
                pace_data.append({
                    'lapNumber': int(lap['LapNumber']),
                    'lapTime': lap_time,
                    'compound': str(lap['Compound']) if 'Compound' in lap else 'UNKNOWN',
                    'tyreLife': int(lap['TyreLife']) if lap['TyreLife'] is not None and not math.isnan(lap['TyreLife']) else 0,
                    'stint': int(lap['Stint']) if 'Stint' in lap and not math.isnan(lap['Stint']) else 1,
                })
            
            all_drivers_data[driver] = pace_data
        
        return {
            'drivers': driver_list,
            'data': all_drivers_data
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stint-analysis/{year}/{gp_round}/{driver}")
async def get_stint_analysis(year: int, gp_round: int, driver: str):
    try:
        import math
        
        session = fastf1.get_session(year, gp_round, 'R')
        session.load()
        
        driver_laps = session.laps.pick_drivers(driver)
        
        stints = {}
        
        for _, lap in driver_laps.iterrows():
            stint_num = int(lap['Stint']) if 'Stint' in lap and not math.isnan(lap['Stint']) else 1
            
            if stint_num not in stints:
                stints[stint_num] = {
                    'stint': stint_num,
                    'compound': str(lap['Compound']) if 'Compound' in lap else 'UNKNOWN',
                    'laps': []
                }
            
            lap_time = None
            if lap['LapTime'] is not None:
                lap_time_seconds = float(lap['LapTime'].total_seconds())
                if not math.isnan(lap_time_seconds) and not math.isinf(lap_time_seconds):
                    lap_time = lap_time_seconds
            
            stints[stint_num]['laps'].append({
                'lapNumber': int(lap['LapNumber']),
                'lapTime': lap_time,
                'tyreLife': int(lap['TyreLife']) if lap['TyreLife'] is not None and not math.isnan(lap['TyreLife']) else 0,
            })
        
        stint_analysis = []
        for stint_num, stint_data in stints.items():
            valid_laps = [lap for lap in stint_data['laps'] if lap['lapTime'] is not None]
            
            if len(valid_laps) > 0:
                avg_lap_time = sum(lap['lapTime'] for lap in valid_laps) / len(valid_laps)
                best_lap_time = min(lap['lapTime'] for lap in valid_laps)
                worst_lap_time = max(lap['lapTime'] for lap in valid_laps)
                
                third = len(valid_laps) // 3
                if third > 0:
                    early_avg = sum(lap['lapTime'] for lap in valid_laps[:third]) / third
                    late_avg = sum(lap['lapTime'] for lap in valid_laps[-third:]) / third
                    degradation = late_avg - early_avg
                else:
                    degradation = 0
                
                stint_analysis.append({
                    'stint': stint_num,
                    'compound': stint_data['compound'],
                    'laps': stint_data['laps'],
                    'totalLaps': len(stint_data['laps']),
                    'avgLapTime': avg_lap_time,
                    'bestLapTime': best_lap_time,
                    'worstLapTime': worst_lap_time,
                    'degradation': degradation
                })
        
        return {
            'driver': driver,
            'stints': stint_analysis
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sector-evolution/{year}/{gp_round}/{driver}")
async def get_sector_evolution(year: int, gp_round: int, driver: str):
    try:
        import math
        
        session = fastf1.get_session(year, gp_round, 'R')
        session.load()
        
        driver_laps = session.laps.pick_drivers(driver)
        
        sector_data = []
        
        for _, lap in driver_laps.iterrows():
            sector1 = None
            sector2 = None
            sector3 = None
            
            if lap['Sector1Time'] is not None:
                s1 = float(lap['Sector1Time'].total_seconds())
                if not math.isnan(s1) and not math.isinf(s1):
                    sector1 = s1
            
            if lap['Sector2Time'] is not None:
                s2 = float(lap['Sector2Time'].total_seconds())
                if not math.isnan(s2) and not math.isinf(s2):
                    sector2 = s2
            
            if lap['Sector3Time'] is not None:
                s3 = float(lap['Sector3Time'].total_seconds())
                if not math.isnan(s3) and not math.isinf(s3):
                    sector3 = s3
            
            sector_data.append({
                'lapNumber': int(lap['LapNumber']),
                'sector1': sector1,
                'sector2': sector2,
                'sector3': sector3,
                'compound': str(lap['Compound']) if 'Compound' in lap else 'UNKNOWN',
                'tyreLife': int(lap['TyreLife']) if lap['TyreLife'] is not None and not math.isnan(lap['TyreLife']) else 0,
            })
        
        return {
            'driver': driver,
            'sectorData': sector_data
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/multi-driver-sectors/{year}/{gp_round}/{session_type}")
async def get_multi_driver_sectors(year: int, gp_round: int, session_type: str, drivers: str):
    try:
        import math
        
        driver_list = drivers.split(',')
        session = fastf1.get_session(year, gp_round, session_type)
        session.load()
        
        all_drivers_sectors = {}
        
        for driver in driver_list:
            driver = driver.strip()
            driver_laps = session.laps.pick_drivers(driver)
            
            # Récupérer le meilleur tour
            fastest_lap = driver_laps.pick_fastest()
            
            sector1 = None
            sector2 = None
            sector3 = None
            
            if fastest_lap['Sector1Time'] is not None:
                s1 = float(fastest_lap['Sector1Time'].total_seconds())
                if not math.isnan(s1) and not math.isinf(s1):
                    sector1 = s1
            
            if fastest_lap['Sector2Time'] is not None:
                s2 = float(fastest_lap['Sector2Time'].total_seconds())
                if not math.isnan(s2) and not math.isinf(s2):
                    sector2 = s2
            
            if fastest_lap['Sector3Time'] is not None:
                s3 = float(fastest_lap['Sector3Time'].total_seconds())
                if not math.isnan(s3) and not math.isinf(s3):
                    sector3 = s3
            
            all_drivers_sectors[driver] = {
                'sector1': sector1,
                'sector2': sector2,
                'sector3': sector3,
                'lapTime': float(fastest_lap['LapTime'].total_seconds()) if fastest_lap['LapTime'] is not None else None,
                'lapNumber': int(fastest_lap['LapNumber']) if 'LapNumber' in fastest_lap else None
            }
        
        return {
            'drivers': driver_list,
            'data': all_drivers_sectors
        }
    except Exception as e:
        import traceback
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
        import traceback
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
        import traceback
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
        import traceback
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
        import traceback
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/racing-line")
async def get_racing_line(year: int, round: int, session: str, driver1: str, driver2: str = None):
    try:
        event = fastf1.get_event(year, round)
        session_obj = event.get_session(session)
        session_obj.load()
        
        # Driver 1
        driver1_lap = session_obj.laps.pick_drivers(driver1).pick_fastest()
        driver1_telemetry = driver1_lap.get_telemetry().add_distance()
        
        result = {
            "driver1": {
                "abbreviation": driver1,
                "lap_time": str(driver1_lap['LapTime']),
                "positions": driver1_telemetry[['X', 'Y', 'Speed']].to_dict('records')
            }
        }
        
        # Driver 2
        if driver2:
            driver2_lap = session_obj.laps.pick_drivers(driver2).pick_fastest()
            driver2_telemetry = driver2_lap.get_telemetry().add_distance()
            result["driver2"] = {
                "abbreviation": driver2,
                "lap_time": str(driver2_lap['LapTime']),
                "positions": driver2_telemetry[['X', 'Y', 'Speed']].to_dict('records')
            }
        
        return result
        
    except Exception as e:
        import traceback
        print(f"\n!!! ERROR in racing-line endpoint !!!")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/calendar")
async def get_calendar(year: int):
    try:
        schedule = fastf1.get_event_schedule(year)
        calendar = []
        
        for idx, event in schedule.iterrows():
            calendar.append({
                "round": event['RoundNumber'],
                "name": event['EventName'],
                "country": event['Country'],
                "date": str(event['EventDate']) if pd.notna(event['EventDate']) else None
            })
        
        return {"grands_prix": calendar}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading calendar: {str(e)}")


@app.get("/drivers")
async def get_drivers(year: int, round: int):
    try:
        event = fastf1.get_event(year, round)
        session = event.get_session('R')
        session.load()
        
        drivers_list = []
        for driver_abbr in session.drivers:
            driver_info = session.get_driver(driver_abbr)
            drivers_list.append({
                "abbreviation": driver_abbr,
                "name": f"{driver_info['FirstName']} {driver_info['LastName']}"
            })
        
        return {"drivers": drivers_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading drivers: {str(e)}")

@app.get("/battles")
async def get_battles(year: int, round: int):
    try:
        event = fastf1.get_event(year, round)
        session = event.get_session('R')
        session.load()
        
        battles = []
        drivers = session.drivers
        
        for i, driver1 in enumerate(drivers):
            for driver2 in drivers[i+1:]:
                driver1_laps = session.laps.pick_driver(driver1)
                driver2_laps = session.laps.pick_driver(driver2)
                
                if driver1_laps.empty or driver2_laps.empty:
                    continue
                
                overtakes = 0
                min_gap = float('inf')
                
                for lap_num in range(1, min(len(driver1_laps), len(driver2_laps))):
                    try:
                        pos1 = driver1_laps.iloc[lap_num]['Position']
                        pos2 = driver2_laps.iloc[lap_num]['Position']
                        prev_pos1 = driver1_laps.iloc[lap_num-1]['Position']
                        prev_pos2 = driver2_laps.iloc[lap_num-1]['Position']
                        
                        if pd.notna(pos1) and pd.notna(pos2) and pd.notna(prev_pos1) and pd.notna(prev_pos2):
                            gap = abs(pos1 - pos2)
                            min_gap = min(min_gap, gap)
                            
                            if (prev_pos1 > prev_pos2 and pos1 < pos2) or (prev_pos1 < prev_pos2 and pos1 > pos2):
                                overtakes += 1
                    except:
                        continue
                
                if overtakes > 0 or min_gap <= 2:
                    driver1_info = session.get_driver(driver1)
                    driver2_info = session.get_driver(driver2)
                    
                    battles.append({
                        "driver1": {
                            "abbreviation": driver1,
                            "name": f"{driver1_info['FirstName']} {driver1_info['LastName']}"
                        },
                        "driver2": {
                            "abbreviation": driver2,
                            "name": f"{driver2_info['FirstName']} {driver2_info['LastName']}"
                        },
                        "overtakes": overtakes,
                        "min_gap": float(min_gap) if min_gap != float('inf') else 0,
                        "intensity": min(overtakes * 2 + (3 - min_gap if min_gap < 3 else 0), 10)
                    })
        
        battles.sort(key=lambda x: x['intensity'], reverse=True)
        
        return {"battles": battles[:10]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading battles: {str(e)}")

@app.get("/api/racing-line/{year}/{gp_round}/{session_type}/{driver}")
async def get_racing_line(year: int, gp_round: int, session_type: str, driver: str):
    try:
        # Charger la session
        session = fastf1.get_session(year, gp_round, session_type)
        session.load()
        
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
        print(f"Error in racing line: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# COPIER CE CODE À LA FIN DE backend/main.py
# ============================================

@app.get("/racing-line-analyzer")
async def get_racing_line_analyzer(year: int, round: int, session: str, driver: str):
    """
    Endpoint dédié pour Racing Line Analyzer
    """
    try:
        log_request("/racing-line-analyzer", {"year": year, "round": round, "session": session, "driver": driver})
        
        session_obj = fastf1.get_session(year, round, session)
        session_obj.load()
        
        driver_laps = session_obj.laps.pick_drivers(driver)
        if driver_laps.empty:
            raise HTTPException(status_code=404, detail=f"No laps found for driver {driver}")
        
        fastest_lap = driver_laps.pick_fastest()
        telemetry = fastest_lap.get_telemetry().add_distance()
        
        if telemetry.empty:
            raise HTTPException(status_code=404, detail="No telemetry data available")
        
        gps_data = []
        for idx, row in telemetry.iterrows():
            if pd.notna(row['X']) and pd.notna(row['Y']) and pd.notna(row['Speed']):
                gps_data.append({
                    "x": float(row['X']),
                    "y": float(row['Y']),
                    "speed": float(row['Speed']),
                    "distance": float(row['Distance']) if pd.notna(row['Distance']) else 0.0
                })
        
        corners = []
        threshold = 15
        corner_id = 1
        i = 20
        
        while i < len(gps_data) - 20:
            prev_speed = gps_data[i - 10]['speed']
            current_speed = gps_data[i]['speed']
            next_speed = gps_data[i + 10]['speed']
            
            if prev_speed - current_speed > threshold and current_speed < prev_speed and current_speed < next_speed:
                min_speed = current_speed
                apex_idx = i
                end_idx = i
                
                for j in range(i, min(i + 30, len(gps_data))):
                    if gps_data[j]['speed'] < min_speed:
                        min_speed = gps_data[j]['speed']
                        apex_idx = j
                    if gps_data[j]['speed'] > current_speed + threshold:
                        end_idx = j
                        break
                
                start_idx = max(0, i - 20)
                end_idx = min(len(gps_data) - 1, end_idx + 20)
                corner_data = gps_data[start_idx:end_idx]
                avg_speed = sum(p['speed'] for p in corner_data) / len(corner_data) if corner_data else 0
                
                corners.append({
                    "id": corner_id,
                    "name": f"T{corner_id}",
                    "startIdx": start_idx,
                    "endIdx": end_idx,
                    "apexIdx": apex_idx,
                    "avgSpeed": avg_speed,
                    "minSpeed": min_speed
                })
                
                corner_id += 1
                i = end_idx
            else:
                i += 1
        
        result = {
            "driver": driver,
            "lap_time": str(fastest_lap['LapTime']),
            "lap_number": int(fastest_lap['LapNumber']),
            "compound": str(fastest_lap['Compound']) if pd.notna(fastest_lap['Compound']) else "UNKNOWN",
            "gps_data": gps_data,
            "corners": corners
        }
        
        log_success("/racing-line-analyzer")
        return result
        
    except Exception as e:
        log_error("/racing-line-analyzer", e)
        import traceback
        print(f"\n!!! ERROR in racing-line-analyzer endpoint !!!")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))# Updated CORS config
