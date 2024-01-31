import RPi.GPIO as GPIO
import time

IN1 = 16
IN2 = 18

GPIO.setmode(GPIO.BOARD)
GPIO.setup(IN1, GPIO.OUT)
GPIO.setup(IN2, GPIO.OUT)

GPIO.output(IN1, GPIO.HIGH)
GPIO.output(IN2, GPIO.LOW)
time.sleep(3)

# 清理 GPIO 设置
GPIO.cleanup()
