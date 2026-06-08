# Face Models & Setup

Optional model installations and setup instructions for improved face detection and embeddings.

Install recommended Python packages:

```bash
pip install -r requirements.txt
# Optional (recommended for best face embeddings):
pip install facenet-pytorch
```

YuNet detector (OpenCV):
- Some OpenCV builds include `FaceDetectorYN`. If your `cv2` has it, the app will use YuNet automatically.
- If you need a model file for YuNet, download the official ONNX model and place it under `data/models/yunet.onnx`.

Runtime notes:
- If `facenet-pytorch` is available and CUDA is present, the face embedding pipeline will use GPU for batch inference.
- If optional packages are missing, the code falls back to Haar cascades and reid embeddings to keep functionality working.

Example API calls:

Enroll a single face (multipart/form-data):

```bash
curl -X POST "http://localhost:8000/api/v1/faces/enroll/single" \
  -F "file=@front.jpg" \
  -F "alias=Alice"
```

Search live cameras for a face embedding (assumes you have an embedding vector saved or produced client-side):

```bash
curl -X POST "http://localhost:8000/api/v1/faces/search/live" \
  -H "Content-Type: application/json" \
  -d '{"embedding": [0.12, 0.34, 0.56], "threshold": 0.6}'
```

Get camera list:

```bash
curl http://localhost:8000/api/v1/cameras
```
