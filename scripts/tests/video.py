"""
@Time: 2024/1/28 13:52
@Auth: huangdingbo
@File: video.py
@IDE: PyCharm
@DESC: 描述
"""
import cv2

# 打开摄像头设备
cap = cv2.VideoCapture('/dev/video0')

# 检查摄像头是否成功打开
if not cap.isOpened():
    print("无法打开摄像头")
    exit()

# 循环读取每一帧
while True:
    # 从摄像头读取一帧
    ret, frame = cap.read()

    # 如果正确读取帧，ret为True
    if not ret:
        print("无法读取视频流")
        break

    # 显示帧
    cv2.imshow('Camera', frame)

    # 按 'q' 键退出循环
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# 释放摄像头资源
cap.release()
# 关闭所有OpenCV窗口
cv2.destroyAllWindows()
