from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import fastf1 as ff1
import pandas as pd
import logging
from scipy import interpolate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ff1.Cache.enable_cache('/tmp/fastf1_cache')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "F1 Metrics API", "status": "running"}

@app.get("/api/seasons")
async def get_seasons():
    return {"seasons": list(range(2018, 2026))}

@app.get("/api/schedule/{year}")
async def get_schedule(year: int):
    try:
        logger.info(f"📅 Loading schedule for {year}")
        schedule = ff1.get_event_schedule(year)
        events = []
        for _, event in schedule.iterrows():
            events.append({
                "round": int(event['RoundNumber']),
                "event_name": event['EventName'],
                "location": event['Location'],
                "country": event['Country'],
            })
        logger.info(f"✅ Loaded {len(events)} events")
        return {"year": year, "events": events}
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/session/drivers")
async def get_drivers(year: int, round: int, session_type: str):
    try:
        logger.info(f"👥 Loading drivers for {year} R{round} {session_type}")
        session = ff1.get_session(year, round, session_type)
        session.load()
        
        drivers = []
        for driver_number in session.drivers:
            driver_info = session.get_driver(driver_number)
            drivers.append({
                "number": str(driver_number),
                "code": driver_info['Abbreviation'],
                "team": driver_info['TeamName'],
                "color": driver_info['TeamColor']
            })
        
        logger.info(f"✅ Loaded {len(drivers)} drivers")
        return {"drivers": drivers}
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/telemetry")
async def get_telemetry(year: int, round: int, session_type: str, driver: str):
    try:
        logger.info(f"📊 Loading telemetry for {driver}")
        session = ff1.get_session(year, round, session_type)
        session.load()
        
        driver_laps = session.laps.pick_driver(driver)
        fastest_lap = driver_laps.pick_fastest()
        telemetry = fastest_lap.get_telemetry()
        
        telemetry_sampled = telemetry.iloc[::10]
        
        data = []
        for _, row in telemetry_sampled.iterrows():
            data.append({
                "distance": float(row.get('Distance', 0)),
                "speed": float(row.get('Speed', 0)),
                "throttle": float(row.get('Throttle', 0)),
                "brake": float(row.get('Brake', 0)),
                "gear": int(row.get('nGear', 0)),
            })
        
        logger.info(f"✅ Loaded {len(data)} telemetry points")
        return {
            "driver": driver,
            "lap_time": fastest_lap['LapTime'].total_seconds() if pd.notna(fastest_lap['LapTime']) else None,
            "telemetry": data
        }
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/telemetry/compare")
async def compare_telemetry(year: int, round: int, session_type: str, driver1: str, driver2: str):
    try:
        logger.info(f"🔄 Comparing {driver1} vs {driver2}")
        session = ff1.get_session(year, round, session_type)
        session.load()
        
        result = {}
        for driver in [driver1, driver2]:
            driver_laps = session.laps.pick_driver(driver)
            fastest_lap = driver_laps.pick_fastest()
            telemetry = fastest_lap.get_telemetry()
            telemetry_sampled = telemetry.iloc[::10]
            
            data = []
            for _, row in telemetry_sampled.iterrows():
                data.append({
                    "distance": float(row.get('Distance', 0)),
                    "speed": float(row.get('Speed', 0)),
                    "throttle": float(row.get('Throttle', 0)),
                    "brake": float(row.get('Brake', 0)),
                })
            
            result[driver] = {
                "lap_time": fastest_lap['LapTime'].total_seconds() if pd.notna(fastest_lap['LapTime']) else None,
                "telemetry": data
            }
        
        logger.info(f"✅ Comparison complete")
        return result
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/telemetry/delta")
async def get_delta(
    year: int = Query(...),
    round: int = Query(...),
    session_type: str = Query(...),
    driver1: str = Query(...),
    driver2: str = Query(...)
):
    try:
        logger.info(f"🔄 Calculating delta: {driver1} vs {driver2}")
        
        session = ff1.get_session(year, round, session_type)
        session.load()
        
        lap1 = session.laps.pick_driver(driver1).pick_fastest()
        lap2 = session.laps.pick_driver(driver2).pick_fastest()
        
        tel1 = lap1.get_telemetry()
        tel2 = lap2.get_telemetry()
        
        tel1['Time_seconds'] = tel1['Time'].dt.total_seconds()
        tel2['Time_seconds'] = tel2['Time'].dt.total_seconds()
        
        tel1 = tel1.add_distance()
        tel2 = tel2.add_distance()
        
        f2 = interpolate.interp1d(tel2['Distance'], tel2['Time_seconds'], 
                                   fill_value='extrapolate', bounds_error=False)
        
        delta_data = []
        for _, row in tel1.iterrows():
            distance = row['Distance']
            time1 = row['Time_seconds']
            time2 = float(f2(distance))
            delta = time1 - time2
            
            delta_data.append({
                'distance': float(distance),
                'delta': float(delta),
                'time1': float(time1),
                'time2': float(time2)
            })
        
        logger.info(f"✅ Delta calculated: {len(delta_data)} points")
        
        return {
            'driver1': driver1,
            'driver2': driver2,
            'lap_time1': float(lap1['LapTime'].total_seconds()),
            'lap_time2': float(lap2['LapTime'].total_seconds()),
            'delta': delta_data
        }
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/telemetry/circuit")
async def get_circuit_telemetry(
    year: int = Query(...),
    round: int = Query(...),
    session_type: str = Query(...),
    driver: str = Query(...)
):
    try:
        logger.info(f"🗺️ Loading circuit data for {driver}")
        
        session = ff1.get_session(year, round, session_type)
        session.load()
        
        lap = session.laps.pick_driver(driver).pick_fastest()
        telemetry = lap.get_telemetry()
        
        circuit_data = []
        for _, row in telemetry.iterrows():
            circuit_data.append({
                'x': float(row.get('X', 0)),
                'y': float(row.get('Y', 0)),
                'speed': float(row.get('Speed', 0)),
                'distance': float(row.get('Distance', 0)),
            })
        
        logger.info(f"✅ Circuit data loaded: {len(circuit_data)} points")
        
        return {
            'driver': driver,
            'lap_time': float(lap['LapTime'].total_seconds()),
            'circuit': circuit_data
        }
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/telemetry/circuit")
async def get_circuit_telemetry(
    year: int = Query(...),
    round: int = Query(...),
    session_type: str = Query(...),
    driver: str = Query(...)
):
    try:
        logger.info(f"🗺️ Loading circuit data for {driver}")
        
        session = ff1.get_session(year, round, session_type)
        session.load()
        
        lap = session.laps.pick_driver(driver).pick_fastest()
        telemetry = lap.get_telemetry()
        
        circuit_data = []
        for _, row in telemetry.iterrows():
            circuit_data.append({
                'x': float(row.get('X', 0)),
                'y': float(row.get('Y', 0)),
                'speed': float(row.get('Speed', 0)),
                'distance': float(row.get('Distance', 0)),
            })
        
        logger.info(f"✅ Circuit data loaded: {len(circuit_data)} points")
        
        return {
            'driver': driver,
            'lap_time': float(lap['LapTime'].total_seconds()),
            'circuit': circuit_data
        }
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/session/laptimes")
async def get_lap_times(
    year: int = Query(...),
    round: int = Query(...),
    session_type: str = Query(...)
):
    try:
        logger.info(f"🏁 Loading lap times for {year} R{round} {session_type}")
        
        session = ff1.get_session(year, round, session_type)
        session.load()
        
        results = []
        for driver_number in session.drivers:
            try:
                driver_info = session.get_driver(driver_number)
                driver_laps = session.laps.pick_driver(driver_number)
                fastest_lap = driver_laps.pick_fastest()
                
                if pd.notna(fastest_lap['LapTime']):
                    results.append({
                        'position': len(results) + 1,
                        'driver': driver_info['Abbreviation'],
                        'team': driver_info['TeamName'],
                        'color': driver_info['TeamColor'],
                        'time': float(fastest_lap['LapTime'].total_seconds()),
                        'lap_number': int(fastest_lap['LapNumber'])
                    })
            except Exception as e:
                logger.warning(f"⚠️ Could not load data for driver {driver_number}: {e}")
                continue
        
        results.sort(key=lambda x: x['time'])
        
        if results:
            leader_time = results[0]['time']
            for i, result in enumerate(results):
                result['position'] = i + 1
                result['gap'] = result['time'] - leader_time if i > 0 else 0.0
        
        logger.info(f"✅ Loaded {len(results)} lap times")
        
        return {
            'session': f"{year} R{round} {session_type}",
            'results': results
        }
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/telemetry/stats")
async def get_telemetry_stats(
    year: int = Query(...),
    round: int = Query(...),
    session_type: str = Query(...),
    driver: str = Query(...)
):
    try:
        logger.info(f"📊 Calculating stats for {driver}")
        
        session = ff1.get_session(year, round, session_type)
        session.load()
        
        lap = session.laps.pick_driver(driver).pick_fastest()
        telemetry = lap.get_telemetry()
        
        telemetry = telemetry.add_distance()
        
        speed_max = float(telemetry['Speed'].max())
        speed_min = float(telemetry['Speed'].min())
        speed_avg = float(telemetry['Speed'].mean())
        
        throttle_avg = float(telemetry['Throttle'].mean())
        brake_points = telemetry[telemetry['Brake'] > 0]
        brake_count = len(brake_points)
        brake_distance = float(brake_points['Distance'].sum() / 1000) if brake_count > 0 else 0
        
        telemetry['Speed_diff'] = telemetry['Speed'].diff()
        max_acceleration = float(telemetry['Speed_diff'].max())
        max_deceleration = float(telemetry['Speed_diff'].min())
        
        gear_changes = int((telemetry['nGear'].diff() != 0).sum())
        
        drs_active = telemetry[telemetry['DRS'] > 0] if 'DRS' in telemetry.columns else []
        drs_distance = float(len(drs_active) / len(telemetry) * 100) if len(telemetry) > 0 else 0
        
        logger.info(f"✅ Stats calculated")
        
        return {
            'driver': driver,
            'lap_time': float(lap['LapTime'].total_seconds()),
            'speed': {
                'max': speed_max,
                'min': speed_min,
                'avg': speed_avg
            },
            'throttle_avg': throttle_avg,
            'brake': {
                'count': brake_count,
                'distance_km': brake_distance
            },
            'acceleration': {
                'max': max_acceleration,
                'max_deceleration': abs(max_deceleration)
            },
            'gear_changes': gear_changes,
            'drs_usage_percent': drs_distance
        }
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/api/results/{year}/{round}")
async def get_race_results(year: int, round: int):
    try:
        logger.info(f"🏁 Loading race results for {year} R{round}")
        
        session = ff1.get_session(year, round, 'R')
        session.load()
        
        results = session.results
        
        race_results = []
        for _, result in results.iterrows():
            race_results.append({
                'position': int(result['Position']) if pd.notna(result['Position']) else None,
                'driver': result['Abbreviation'],
                'driver_number': str(result['DriverNumber']),
                'team': result['TeamName'],
                'points': float(result['Points']) if pd.notna(result['Points']) else 0,
                'status': result['Status'],
                'time': str(result['Time']) if pd.notna(result['Time']) else 'DNF'
            })
        
        logger.info(f"✅ Loaded {len(race_results)} results")
        
        return {
            'year': year,
            'round': round,
            'results': race_results
        }
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/standings/{year}/drivers")
async def get_driver_standings(year: int):
    try:
        logger.info(f"🏆 Loading driver standings for {year}")
        
        schedule = ff1.get_event_schedule(year)
        last_round = schedule[schedule['EventDate'] <= pd.Timestamp.now()]['RoundNumber'].max()
        
        if pd.isna(last_round):
            last_round = 1
        
        session = ff1.get_session(year, int(last_round), 'R')
        session.load()
        
        standings = []
        drivers_points = {}
        
        for round_num in range(1, int(last_round) + 1):
            try:
                race = ff1.get_session(year, round_num, 'R')
                race.load()
                results = race.results
                
                for _, result in results.iterrows():
                    driver = result['Abbreviation']
                    points = float(result['Points']) if pd.notna(result['Points']) else 0
                    
                    if driver not in drivers_points:
                        drivers_points[driver] = {
                            'driver': driver,
                            'team': result['TeamName'],
                            'points': 0
                        }
                    drivers_points[driver]['points'] += points
            except:
                continue
        
        standings = sorted(drivers_points.values(), key=lambda x: x['points'], reverse=True)
        
        for i, driver in enumerate(standings):
            driver['position'] = i + 1
        
        logger.info(f"✅ Loaded standings for {len(standings)} drivers")
        
        return {
            'year': year,
            'standings': standings
        }
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/telemetry/race-animation")
async def get_race_animation(
    year: int = Query(...),
    round: int = Query(...),
    session_type: str = Query(...),
    driver1: str = Query(...),
    driver2: str = Query(...)
):
    try:
        logger.info(f"🎬 Loading animation data: {driver1} vs {driver2}")
        
        session = ff1.get_session(year, round, session_type)
        session.load()
        
        lap1 = session.laps.pick_driver(driver1).pick_fastest()
        lap2 = session.laps.pick_driver(driver2).pick_fastest()
        
        tel1 = lap1.get_telemetry().add_distance()
        tel2 = lap2.get_telemetry().add_distance()
        
        tel1['Time_seconds'] = tel1['Time'].dt.total_seconds()
        tel2['Time_seconds'] = tel2['Time'].dt.total_seconds()
        
        from scipy import interpolate
        
        max_distance = min(tel1['Distance'].max(), tel2['Distance'].max())
        distances = range(0, int(max_distance), 50)
        
        f1_x = interpolate.interp1d(tel1['Distance'], tel1['X'], fill_value='extrapolate')
        f1_y = interpolate.interp1d(tel1['Distance'], tel1['Y'], fill_value='extrapolate')
        f1_time = interpolate.interp1d(tel1['Distance'], tel1['Time_seconds'], fill_value='extrapolate')
        f1_speed = interpolate.interp1d(tel1['Distance'], tel1['Speed'], fill_value='extrapolate')
        
        f2_x = interpolate.interp1d(tel2['Distance'], tel2['X'], fill_value='extrapolate')
        f2_y = interpolate.interp1d(tel2['Distance'], tel2['Y'], fill_value='extrapolate')
        f2_time = interpolate.interp1d(tel2['Distance'], tel2['Time_seconds'], fill_value='extrapolate')
        f2_speed = interpolate.interp1d(tel2['Distance'], tel2['Speed'], fill_value='extrapolate')
        
        animation_data = []
        for dist in distances:
            time1 = float(f1_time(dist))
            time2 = float(f2_time(dist))
            
            animation_data.append({
                'distance': float(dist),
                'driver1': {
                    'x': float(f1_x(dist)),
                    'y': float(f1_y(dist)),
                    'time': time1,
                    'speed': float(f1_speed(dist))
                },
                'driver2': {
                    'x': float(f2_x(dist)),
                    'y': float(f2_y(dist)),
                    'time': time2,
                    'speed': float(f2_speed(dist))
                },
                'delta': time1 - time2
            })
        
        circuit_points = []
        for _, row in tel1[::20].iterrows():
            circuit_points.append({
                'x': float(row['X']),
                'y': float(row['Y'])
            })
        
        logger.info(f"✅ Animation data ready: {len(animation_data)} frames")
        
        return {
            'driver1': driver1,
            'driver2': driver2,
            'lap_time1': float(lap1['LapTime'].total_seconds()),
            'lap_time2': float(lap2['LapTime'].total_seconds()),
            'circuit': circuit_points,
            'animation': animation_data
        }
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
