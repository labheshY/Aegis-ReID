from app.services.tracker_service import tracker_service

def get_active_target_embeddings():
    target_id = tracker_service.current_search_target
    if target_id is None:
        return None
    return tracker_service.acquisition_manager.get_embeddings()
