import os
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken


class SecretStore:
    def __init__(self, key: Optional[str] = None):
        k = key or os.getenv("SECRET_KEY")
        if not k:
            raise RuntimeError("SECRET_KEY environment variable is required for SecretStore")
        if isinstance(k, str):
            k = k.encode()
        self._fernet = Fernet(k)

    def encrypt(self, plaintext: str) -> str:
        return self._fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, token: str) -> Optional[str]:
        try:
            return self._fernet.decrypt(token.encode()).decode()
        except InvalidToken:
            return None


# module-level instance (constructed on import using env var)
try:
    secret_store = SecretStore()
except Exception:
    # Defer failure until used; allow imports in environments without SECRET_KEY
    secret_store = None
