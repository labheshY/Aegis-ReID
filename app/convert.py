from ultralytics import YOLO

# Load your model weights
model = YOLO("models/yolo26n.pt") # or yolo11n.pt

# Export with dynamic width and height configurations
model.export(
    format="onnx",
    opset=17,
    dynamic=True,          # CRITICAL: Allows the model to accept ANY video resolution
    simplify=True,         # Keeps execution fast on older CPUs
    half=True              # Runs at FP16 precision to protect your hardware from lagging
)
