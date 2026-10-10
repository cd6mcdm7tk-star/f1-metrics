import asyncio

from app import season


def entry(driver_id, position, **extra):
    return {"position": str(position), "Driver": {"driverId": driver_id, "code": driver_id[:3].upper(),
                                                   "givenName": "G", "familyName": "F", "url": "x"}, **extra}


def test_slim_result_keeps_only_what_the_page_reads():
    full = entry("verstappen", 1, points="25", grid="1", status="Finished", laps="57",
                 Constructor={"constructorId": "red_bull", "name": "Red Bull"},
                 FastestLap={"rank": "1", "lap": "40"}, Time={"millis": "1"})

    assert season._slim_result(full) == {
        "position": "1",
        "Driver": {"driverId": "verstappen", "code": "VER", "givenName": "G", "familyName": "F"},
        "points": "25", "grid": "1", "status": "Finished",
        "Constructor": {"name": "Red Bull"},
        "FastestLap": {"rank": "1"},
    }


def test_all_races_merges_a_race_split_across_pages(monkeypatch):
    # Jolpica pages hold 100 entries: round 2 starts on page 1 and ends on page 2
    pages = {
        0: {"total": "103", "RaceTable": {"Races": [
            {"round": "1", "raceName": "R1", "Results": [entry(f"d{i}", i + 1) for i in range(80)]},
            {"round": "2", "raceName": "R2", "Results": [entry(f"d{i}", i + 1) for i in range(20)]},
        ]}},
        100: {"total": "103", "RaceTable": {"Races": [
            {"round": "2", "raceName": "R2", "Results": [entry(f"d{i}", i + 1) for i in range(20, 23)]},
        ]}},
    }

    async def fake_get(client, path, params=None):
        return pages[params["offset"]]

    monkeypatch.setattr(season, "_jolpica_get", fake_get)
    races = asyncio.run(season._jolpica_all_races(None, "2025/results.json", "Results"))

    assert [r["round"] for r in races] == ["1", "2"]
    assert len(races[1]["Results"]) == 23
