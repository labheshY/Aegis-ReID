from app.reid.target_acquisition import TargetAcquisitionManager

manager = TargetAcquisitionManager()

manager.load_payload(63)

print(manager.get_payload())
print(len(manager.get_embeddings()))
print(manager.acquisition_complete)