import numpy as np
import pandas as pd

from app.telemetry import corner_distances, prepare_tel


def test_prepare_tel_makes_distance_strictly_increasing_and_fills_channels():
    tel = pd.DataFrame({
        "Distance": [0.0, np.nan, 10.0, 10.0, 5.0],
        "Speed": [100, 110, 120, 121, 115],
        "Throttle": [100, 100, np.nan, 90, 80],
        "Brake": [0, 0, 1, 1, 0],
        "nGear": [7, 7, np.nan, 6, 7],
    })

    out = prepare_tel(tel)

    assert out["Distance"].tolist() == [0.0, 5.0, 10.0]
    assert out["Throttle"].tolist() == [100, 80, 0]  # NaN -> 0
    assert out["nGear"].tolist() == [7, 7, 0]
    assert (out[["DRS", "X", "Y"]] == 0).all().all()  # missing channels created


def test_prepare_tel_without_distance_is_unusable():
    assert prepare_tel(pd.DataFrame({"Speed": [1, 2]})).empty


def test_corner_distances_search_forward_along_the_lap():
    # Out along y=0, back along y=2: an out-and-back section where corner 2
    # sits closer (in X/Y) to the outward leg than to its real spot on the way back.
    x = np.concatenate([np.arange(0, 101), np.arange(100, -1, -1)]).astype(float)
    y = np.concatenate([np.zeros(101), np.full(101, 2.0)])
    dist = np.arange(len(x), dtype=float)
    corners = [
        {"number": 1, "letter": None, "x": 90.0, "y": 0.0},
        {"number": 2, "letter": None, "x": 85.0, "y": 0.8},
    ]

    placed = corner_distances(corners, x, y, dist)

    assert placed[0]["distance"] == 90.0
    assert placed[1]["distance"] == 116.0  # on the way back (x=85, second leg), not 85.0
