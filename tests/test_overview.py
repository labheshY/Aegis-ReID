from app.services.overview_service import build_overview


def test_build_overview_shape():
    data = build_overview()
    assert "counts" in data
    assert "registered_targets" in data["counts"]
    assert "tracker" in data
    assert "gpu" in data
    assert "storage" in data
