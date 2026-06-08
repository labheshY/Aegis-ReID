from types import SimpleNamespace

import pytest

from app.services.tracker_service import tracker_service
from app.services import camera_manager


def test_tracker_switch_camera_calls_camera_manager(monkeypatch):
    called = {}

    def fake_start(cam_id):
        called['started'] = cam_id

    monkeypatch.setattr('app.services.tracker_service.camera_manager.start_capture', fake_start)

    # switch camera
    tracker_service.switch_camera('cam-42')

    assert tracker_service.camera_id == 'cam-42'
    assert called.get('started') == 'cam-42'
