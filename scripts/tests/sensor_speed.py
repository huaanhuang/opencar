"""
@Time: 2024/1/28 19:28
@Auth: huangdingbo
@File: sensor_speed.py
@IDE: PyCharm
@DESC: 霍尔传感器
"""
import RPi.GPIO as GPIO
import time

# 设置GPIO模式为BCM
GPIO.setmode(GPIO.BOARD)

# 设置你连接霍尔传感器的GPIO引脚编号
HALL_SENSOR_PIN = 16  # 例如，如果你将传感器连接到GPIO 16

# 设置该引脚为输入，并启用内部上拉电阻
GPIO.setup(HALL_SENSOR_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)

# 初始化变量
last_time = time.time()
num_pulses = 0


# 回调函数，当脉冲发生时被调用
def sensor_callback(channel):
    global last_time, num_pulses
    current_time = time.time()
    rpm = 60 / (current_time - last_time)
    last_time = current_time
    num_pulses += 1
    # print(f"RPM: {rpm:.2f}")


# 添加事件检测，当引脚状态从高到低变化时调用回调函数
GPIO.add_event_detect(HALL_SENSOR_PIN, GPIO.FALLING, callback=sensor_callback)

try:
    # 主循环，等待事件发生
    print("Measuring motor speed (press CTRL+C to exit)")
    while True:
        time.sleep(1)  # 1秒钟打印一次脉冲数
        print(f"Pulses counted: {num_pulses}")
        num_pulses = 0  # 重置脉冲计数

except KeyboardInterrupt:
    print("Measurement stopped by user")

finally:
    # 清理GPIO设置
    GPIO.cleanup()
