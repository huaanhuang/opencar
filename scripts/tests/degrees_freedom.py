"""
@Time: 2024/1/27 17:59
@Auth: huangdingbo
@File: degrees_freedom.py
@IDE: PyCharm
@DESC: 二自由度舵机控制
"""
import RPi.GPIO as GPIO


# 检查引脚是否已经被设置的函数
def is_pin_setup(pin):
    try:
        GPIO.setup(pin, GPIO.IN)
        GPIO.setup(pin, GPIO.OUT)
    except RuntimeWarning:
        return True
    return False


# 设置GPIO模式为BCM
GPIO.setmode(GPIO.BOARD)

# 引脚
IN = 8
