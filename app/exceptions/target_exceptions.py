class TargetNotFoundException(Exception):
    def __init__(self, target_id: str):
        self.target_id = target_id