from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import fastf1 as ff1
from fastf1 import plotting
import pandas as pd

# Enable FastF1 cache
ff1.Cache.enable_cache('cache')

app = FastAPI(title="Metrik F1 API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Metrik F1 API - Running"}

@app.get("/api/schedule")
async def get_schedule(year: int = 2024):
    """Get F1 schedule for a given year"""
    try:
        schedule = ff1.get_event_schedule(year)
        events = []
        
        for _, event in schedule.iterrows():
            events.append({
                'round': int(event['RoundNumber']),
                'event_name': event['EventName'],
                'location': event['Location'],
                'country': event['Country'],
            })
        
        return {'events': events}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/drivers")
async def get_drivers(year: int, round: int, session: str):
    """Get list of drivers for a session"""
    try:
        event = ff1.get_event(year, round)
        session_obj = event.get_session(session)
        session_obj.load()
        
        drivers_data = []
        for _, driver in session_obj.results.iterrows():
            drivers_data.append({
                'code': driver['Abbreviation'],
                'number': int(driver['DriverNumber']) if pd.notna(driver['DriverNumber']) else 0,
                'team': driver['TeamName']
            })
        
        return {'drivers': drivers_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/telemetry")
async def get_telemetry(year: int, round: int, session: str, driver: str):
    """Get telemetry data for a specific driver"""
    try:
        # Load session
        event = ff1.get_event(year, round)
        session_obj = event.get_session(session)
        session_obj.load()
        
        # Get driver laps
        driver_laps = session_obj.laps.pick_driver(driver)
        if driver_laps.empty:
            raise HTTPException(status_code=404, detail="No laps found for this driver")
        
        # Get fastest lap
        fastest_lap = driver_laps.pick_fastest()
        
        # Get telemetry
        telemetry = fastest_lap.get_telemetry()
        
        # Build telemetry data
        telemetry_data = []
        for _, row in telemetry.iterrows():
            telemetry_data.append({
                'distance': float(row['Distance']),
                'speed': float(row['Speed']),
                'throttle': float(row['Throttle']),
                'brake': float(row['Brake']) if 'Brake' in row else 0,
                'gear': int(row['nGear']) if 'nGear' in row else 0,
            })
        
        return {
            'telemetry': telemetry_data,
            'lap_time': float(fastest_lap['LapTime'].total_seconds())
        }
        
    except Exception as e:
        print(f"Error in get_telemetry: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/compare-telemetry")
async def compare_telemetry(year: int, round: int, session: str, driver1: str, driver2: str):
    """Compare telemetry between two drivers"""
    try:
        # Load session
        event = ff1.get_event(year, round)
        session_obj = event.get_session(session)
        session_obj.load()
        
        # Get laps for both drivers
        driver1_laps = session_obj.laps.pick_driver(driver1)
        driver2_laps = session_obj.laps.pick_driver(driver2)
        
        if driver1_laps.empty or driver2_laps.empty:
            raise HTTPException(status_code=404, detail="No laps found for one or both drivers")
        
        # Get fastest laps
        fastest_lap_1 = driver1_laps.pick_fastest()
        fastest_lap_2 = driver2_laps.pick_fastest()
        
        # Get telemetry
        telemetry_1 = fastest_lap_1.get_telemetry()
        telemetry_2 = fastest_lap_2.get_telemetry()
        
        # Build telemetry data for driver 1
        telemetry_data_1 = []
        for _, row in telemetry_1.iterrows():
            telemetry_data_1.append({
                'distance': float(row['Distance']),
                'speed': float(row['Speed']),
                'throttle': float(row['Throttle']),
                'brake': float(row['Brake']) if 'Brake' in row else 0,
                'gear': int(row['nGear']) if 'nGear' in row else 0,
            })
        
        # Build telemetry data for driver 2
        telemetry_data_2 = []
        for _, row in telemetry_2.iterrows():
            telemetry_data_2.append({
                'distance': float(row['Distance']),
                'speed': float(row['Speed']),
                'throttle': float(row['Throttle']),
                'brake': float(row['Brake']) if 'Brake' in row else 0,
                'gear': int(row['nGear']) if 'nGear' in row else 0,
            })
        
        return {
            driver1: {
                'telemetry': telemetry_data_1,
                'lap_time': float(fastest_lap_1['LapTime'].total_seconds())
            },
            driver2: {
                'telemetry': telemetry_data_2,
                'lap_time': float(fastest_lap_2['LapTime'].total_seconds())
            }
        }
        
    except Exception as e:
        print(f"Error in compare_telemetry: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/delta")
async def get_delta(year: int, round: int, session: str, driver1: str, driver2: str):
    """Get delta time between two drivers"""
    try:
        # Load session
        event = ff1.get_event(year, round)
        session_obj = event.get_session(session)
        session_obj.load()
        
        # Get laps
        driver1_laps = session_obj.laps.pick_driver(driver1)
        driver2_laps = session_obj.laps.pick_driver(driver2)
        
        if driver1_laps.empty or driver2_laps.empty:
            raise HTTPException(status_code=404, detail="No laps found")
        
        # Get fastest laps
        fastest_lap_1 = driver1_laps.pick_fastest()
        fastest_lap_2 = driver2_laps.pick_fastest()
        
        # Get telemetry
        tel_1 = fastest_lap_1.get_telemetry()
        tel_2 = fastest_lap_2.get_telemetry()
        
        # Add distance column
        tel_1['Distance'] = tel_1['Distance']
        tel_2['Distance'] = tel_2['Distance']
        
        # Merge on distance
        merged = pd.merge_asof(
            tel_1[['Distance', 'Time']].rename(columns={'Time': 'Time1'}),
            tel_2[['Distance', 'Time']].rename(columns={'Time': 'Time2'}),
            on='Distance',
            direction='nearest'
        )
        
        # Calculate delta
        merged['Delta'] = (merged['Time1'] - merged['Time2']).dt.total_seconds()
        
        # Build delta data
        delta_data = []
        for _, row in merged.iterrows():
            delta_data.append({
                'distance': float(row['Distance']),
                'delta': float(row['Delta'])
            })
        
        return {'delta': delta_data}
        
    except Exception as e:
        print(f"Error in get_delta: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/circuit")
async def get_circuit(year: int, round: int, session: str, driver: str):
    """Get circuit trajectory with speed data"""
    try:
        # Load session
        event = ff1.get_event(year, round)
        session_obj = event.get_session(session)
        session_obj.load()
        
        # Get driver laps
        driver_laps = session_obj.laps.pick_driver(driver)
        if driver_laps.empty:
            raise HTTPException(status_code=404, detail="No laps found for this driver")
        
        # Get fastest lap
        fastest_lap = driver_laps.pick_fastest()
        
        # Get telemetry
        telemetry = fastest_lap.get_telemetry()
        
        # Build positions with speed
        positions = []
        for _, row in telemetry.iterrows():
            positions.append({
                'x': float(row['X']),
                'y': float(row['Y']),
                'speed': float(row['Speed'])
            })
        
        return {
            'circuit_name': event.EventName,
            'lap_time': float(fastest_lap['LapTime'].total_seconds()),
            'positions': positions
        }
        
    except Exception as e:
        print(f"Error in get_circuit: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/lap-times")
async def get_lap_times(year: int, round: int, session: str):
    """Get lap times ranking"""
    try:
        event = ff1.get_event(year, round)
        session_obj = event.get_session(session)
        session_obj.load()
        
        # Get all laps
        laps = session_obj.laps
        
        # Get fastest lap per driver
        fastest_laps = laps.groupby('Driver').apply(lambda x: x.loc[x['LapTime'].idxmin()]).reset_index(drop=True)
        
        # Sort by lap time
        fastest_laps = fastest_laps.sort_values('LapTime')
        
        lap_times = []
        for _, lap in fastest_laps.iterrows():
            lap_times.append({
                'code': lap['Driver'],
                'number': int(lap['DriverNumber']) if pd.notna(lap['DriverNumber']) else 0,
                'team': lap['Team'],
                'best_lap_time': float(lap['LapTime'].total_seconds())
            })
        
        return {'lap_times': lap_times}
        
    except Exception as e:
        print(f"Error in get_lap_times: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
async def get_stats(year: int, round: int, session: str):
    """Get statistics for all drivers"""
    try:
        event = ff1.get_event(year, round)
        session_obj = event.get_session(session)
        session_obj.load()
        
        drivers_stats = []
        
        for driver in session_obj.drivers:
            try:
                driver_laps = session_obj.laps.pick_driver(driver)
                if driver_laps.empty:
                    continue
                
                fastest_lap = driver_laps.pick_fastest()
                telemetry = fastest_lap.get_telemetry()
                
                speeds = telemetry['Speed'].values
                
                driver_info = session_obj.get_driver(driver)
                
                drivers_stats.append({
                    'code': driver,
                    'number': int(driver_info['DriverNumber']) if pd.notna(driver_info['DriverNumber']) else 0,
                    'team': driver_info['TeamName'],
                    'avg_speed': float(speeds.mean()),
                    'max_speed': float(speeds.max()),
                    'min_speed': float(speeds.min())
                })
            except:
                continue
        
        # Sort by avg speed
        drivers_stats.sort(key=lambda x: x['avg_speed'], reverse=True)
        
        return {'drivers': drivers_stats}
        
    except Exception as e:
        print(f"Error in get_stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/results")
async def get_results(year: int, round: int):
    """Get race results"""
    try:
        event = ff1.get_event(year, round)
        session_obj = event.get_race()
        session_obj.load()
        
        results = []
        for _, result in session_obj.results.iterrows():
            results.append({
                'position': int(result['Position']) if pd.notna(result['Position']) else 0,
                'driver': result['Abbreviation'],
                'team': result['TeamName'],
                'time': str(result['Time']) if pd.notna(result['Time']) else '-',
                'status': result['Status'],
                'points': int(result['Points']) if pd.notna(result['Points']) else 0
            })
        
        return {
            'event_name': event.EventName,
            'location': event.Location,
            'country': event.Country,
            'results': results
        }
        
    except Exception as e:
        print(f"Error in get_results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/animation")
async def get_animation(year: int, round: int, session: str, driver1: str, driver2: str):
    """Get animation data for two drivers"""
    try:
        event = ff1.get_event(year, round)
        session_obj = event.get_session(session)
        session_obj.load()
        
        driver1_laps = session_obj.laps.pick_driver(driver1)
        driver2_laps = session_obj.laps.pick_driver(driver2)
        
        if driver1_laps.empty or driver2_laps.empty:
            raise HTTPException(status_code=404, detail="No laps found")
        
        fastest_lap_1 = driver1_laps.pick_fastest()
        fastest_lap_2 = driver2_laps.pick_fastest()
        
        tel_1 = fastest_lap_1.get_telemetry()
        tel_2 = fastest_lap_2.get_telemetry()
        
        positions_1 = []
        for _, row in tel_1.iterrows():
            positions_1.append({
                'x': float(row['X']),
                'y': float(row['Y'])
            })
        
        positions_2 = []
        for _, row in tel_2.iterrows():
            positions_2.append({
                'x': float(row['X']),
                'y': float(row['Y'])
            })
        
        return {
            'positions_1': positions_1,
            'positions_2': positions_2
        }
        
    except Exception as e:
        print(f"Error in get_animation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)