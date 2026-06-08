import json
from pathlib import Path
from app.core.config import RUNTIME_STATE_FILE, DEFAULT_TRACKER_SETTINGS
from app.core.logger import logger


class SettingsService:
    def __init__(self):
        self.path: Path = RUNTIME_STATE_FILE
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.settings = DEFAULT_TRACKER_SETTINGS.copy()
        self._load()

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
        for k, v in updates.items():
            if v is not None:
                self.settings[k] = v
        self._save()
        return self.get()


settings_service = SettingsService()
