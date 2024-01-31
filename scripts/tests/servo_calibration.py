"""
@Time: 2024/1/28 15:23
@Auth: huangdingbo
@File: servo_calibration.py
@IDE: PyCharm
@DESC: 舵机校准
摄像头舵机测试结果：上下 4-11  左右：2.5 - 7.5 -12.5
0.05 => 1度
"""
import sys
import RPi.GPIO as GPIO
import time


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

args = sys.argv
# 引脚
IN = int(args[1])
# 频率
frequency = float(args[2])

print("测试引脚: {} | 频率: {}".format(IN, frequency))

# 使用函数检查引脚
if is_pin_setup(IN):
    print(f"警告: 引脚 {IN} 已经被设置过了。")
    exit()
else:
    print(f"引脚 {IN} 没有被设置过，可以使用。")

# 设置GPIO引脚，例如GPIO18为输出模式，并且是PWM引脚
GPIO.setup(IN, GPIO.OUT)

# 创建一个PWM实例，设置频率为50Hz（舵机通常使用50Hz的PWM信号）
pwm = GPIO.PWM(IN, 50)

# 启动PWM，并设置初始占空比（比如7.5是中立位置）
pwm.start(7.5)

try:
    time.sleep(5)
    pwm.ChangeDutyCycle(frequency)
    time.sleep(10)
except Exception as e:
    print(e)
    time.sleep(1)
finally:
    pwm.start(7.5)
    time.sleep(1)
    # 停止PWM
    pwm.stop()
    # 清理GPIO设置
    GPIO.cleanup()

