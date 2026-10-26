import numpy as np
import pandas as pd

from app.telemetry import aligned_distance, corner_distances, corners_from_multiviewer, path_distances, prepare_tel


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


# A 1 km straight sampled every 20 m, positions in tenths of a metre like OpenF1's
REF_DIST = np.arange(0, 1001, 20, dtype=float)
REF_X, REF_Y = REF_DIST * 10, np.zeros(len(REF_DIST))


def test_path_distances_measure_along_the_reference_path():
    x = np.array([55.0, 1234.0, 5000.0])
    y = np.array([20.0, -30.0, 2000.0])  # the last one is 200 m off the path

    along = path_distances(x, y, REF_X, REF_Y, REF_DIST)

    assert along[:2].tolist() == [5.5, 123.4]
    assert np.isnan(along[2])


def test_a_lap_measured_10_m_short_is_put_back_onto_the_reference():
    true = np.arange(5, 996, 15, dtype=float)

    aligned = aligned_distance(true - 10, true * 10, np.zeros(len(true)), REF_DIST, REF_X, REF_Y)

    assert np.allclose(aligned, true, atol=1e-3)
    assert np.all(np.diff(aligned) > 0)


def test_a_lap_without_usable_positions_keeps_its_distance():
    dist = np.arange(0, 1000, 15, dtype=float)

    assert aligned_distance(dist, np.zeros(len(dist)), np.zeros(len(dist)), REF_DIST, REF_X, REF_Y) is dist
    elsewhere = aligned_distance(dist, dist * 10, np.full(len(dist), 9000.0), REF_DIST, REF_X, REF_Y)
    assert elsewhere is dist


def test_multiviewer_layouts_give_corners_and_rotation():
    data = {
        "rotation": 280,
        "corners": [
            {"number": 1, "angle": -35.3, "trackPosition": {"x": 4294.86, "y": 2690.72}},
            {"number": 9, "letter": "a", "trackPosition": {"x": -120, "y": 55.5}},
        ],
    }

    assert corners_from_multiviewer(data) == {
        "corners": [
            {"number": 1, "letter": None, "x": 4294.86, "y": 2690.72},
            {"number": 9, "letter": "a", "x": -120.0, "y": 55.5},
        ],
        "rotation": 280.0,
    }
