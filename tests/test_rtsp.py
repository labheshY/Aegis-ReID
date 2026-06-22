import cv2

url = "rtsp://localhost:8554/cam_target"

cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)

print("opened:", cap.isOpened())

while True:
    ret, frame = cap.read()

    if ret:
        print("frame received", frame.shape)
        break

print("done")
cap.release()