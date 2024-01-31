"""
@Time: 2024/1/21 16:32
@Auth: huangdingbo
@File: end.py
@IDE: PyCharm
@DESC: 后驱测试
"""

import RPi.GPIO as GPIO

try:
    GPIO.cleanup()
except Exception as e:
    pass

# EN2 = 11
IN3 = 13
IN4 = 15

GPIO.setmode(GPIO.BOARD)
#
GPIO.setup(IN3, GPIO.OUT)
GPIO.setup(IN4, GPIO.OUT)
GPIO.output(IN3, GPIO.LOW)
GPIO.output(IN4, GPIO.LOW)

