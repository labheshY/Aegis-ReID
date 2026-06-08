from typing import List, Tuple
import cv2
import numpy as np
from app.core.logger import logger


def detect_faces_opencv(image: 'np.ndarray') -> List[Tuple[int, int, int, int]]:
    """Detect faces using OpenCV Haarcascade as a fallback.
    Returns list of (x, y, w, h).
    """
    try:
        casc_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        detector = cv2.CascadeClassifier(casc_path)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
        return [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in faces]
    except Exception:
        logger.exception('Haar cascade face detection failed')
        return []


def detect_faces(image: 'np.ndarray') -> list:
    """Unified face detection: currently uses Haar cascade; can be extended to YuNet.
    Returns list of bounding boxes in [x1,y1,x2,y2] format.
    """
    # Try YuNet if available
    try:
        if hasattr(cv2, 'FaceDetectorYN'):
            try:
                # attempt to create a YuNet detector if OpenCV supports it
                model = cv2.FaceDetectorYN.create(cv2.data.haarcascades + 'face_detection_yunet_2022mar.onnx', '', (0,0))
                ok, faces = model.detect(image)
                rects = []
                if ok and faces is not None:
                    for f in faces:
                        x, y, w, h = map(int, f[:4])
                        rects.append([x, y, x + w, y + h])
                    return rects
            except Exception:
                # YuNet not available or model missing; fall back
                pass

    except Exception:
        pass

    rects = []
    faces = detect_faces_opencv(image)
    for (x, y, w, h) in faces:
        rects.append([x, y, x + w, y + h])
    return rects


def crop_image(image: 'np.ndarray', bbox: list):
    x1, y1, x2, y2 = bbox
    h, w = image.shape[:2]
    x1 = max(0, int(x1)); y1 = max(0, int(y1)); x2 = min(w, int(x2)); y2 = min(h, int(y2))
    return image[y1:y2, x1:x2]
