import json
from pathlib import Path
from app.core.config import RUNTIME_STATE_FILE, DEFAULT_TRACKER_SETTINGS
from app.core.logger import logger
from app.utils.tracker_yaml import save_bytetrack_yaml

class SettingsService:
    def __init__(self):
        self.path: Path = RUNTIME_STATE_FILE
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.settings = DEFAULT_TRACKER_SETTINGS.copy()
        self._load()
        save_bytetrack_yaml(self.settings)

    def _load(self):
        if self.path.exists():
            try:
                with open(self.path, 'r', encoding='utf-8') as fh:
                    data = json.load(fh)
                    # merge
                    self.settings.update(data.get('settings', {}))
            except Exception:
                logger.exception('Failed to load runtime settings file')

    def _save(self):
        try:
            with open(self.path, 'w', encoding='utf-8') as fh:
                json.dump({'settings': self.settings}, fh, indent=2)
        except Exception:
            logger.exception('Failed to save runtime settings file')

    def get(self):
        return self.settings.copy()

    def update(self, updates: dict):
        from app.services.tracker_service import tracker_service
        for k, v in updates.items():
            if v is not None:
                self.settings[k] = v
        tracker_service.settings.update(updates)
        self._save()
        return self.get()


settings_service = SettingsService()
