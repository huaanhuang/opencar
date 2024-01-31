"""
@Time: 2024/1/30 19:16
@Auth: huangdingbo
@File: led.py
@IDE: PyCharm
@DESC: 描述
"""
import RPi.GPIO as GPIO
import time

# 设置GPIO模式为BCM
GPIO.setmode(GPIO.BOARD)

# 设置GPIO17为输出模式
LED_PIN = 7 # 前
# 后红 21
# 左黄 19
# 右黄 23
GPIO.setup(LED_PIN, GPIO.OUT)

# 循环闪烁LED
try:
    while True:
        # 打开LED
        GPIO.output(LED_PIN, GPIO.HIGH)
        time.sleep(1)  # 等待1秒
        # 关闭LED
        GPIO.output(LED_PIN, GPIO.LOW)
        time.sleep(1)  # 等待1秒
except KeyboardInterrupt:
    # 捕获到Ctrl+C时，清理GPIO状态
    GPIO.cleanup()