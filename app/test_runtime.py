from app.services.runtime_service import get_runtime_mode, set_runtime_mode

set_runtime_mode("acquisition")

print(get_runtime_mode())