from app.core.config import RUNTIME_STATE_FILE
import json

DEFAULT_STATE = {
    "mode": "idle"
}

VALID_MODES = {"idle", "acquisition", "search"}

def get_runtime_state():
    if not RUNTIME_STATE_FILE.exists():
        return DEFAULT_STATE.copy()
    try:
        with open(RUNTIME_STATE_FILE, "r") as f:
            state = json.load(f)
        mode = state.get("mode", DEFAULT_STATE["mode"])
        if mode not in VALID_MODES:
            return DEFAULT_STATE.copy()
        return {"mode": mode}
    except Exception:
        return DEFAULT_STATE.copy()
    
def set_runtime_state(state: dict):
    mode = state.get("mode", DEFAULT_STATE["mode"])
    return set_runtime_mode(mode)

def set_runtime_mode(mode: str):
    if mode not in VALID_MODES:
        raise ValueError(f"Invalid runtime mode: {mode}")

    state = {
        "mode": mode
    }
    RUNTIME_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(RUNTIME_STATE_FILE, "w") as f:
        json.dump(state, f)

    return state

def get_runtime_mode():
    return get_runtime_state().get("mode", DEFAULT_STATE["mode"])
