"""
@Time: 2024/1/22 22:29
@Auth: huangdingbo
@File: beep.py
@IDE: PyCharm
@DESC: 描述
"""
import threading

import RPi.GPIO as GPIO
import time

# 设置GPIO模式为BCM
GPIO.setmode(GPIO.BOARD)

# 设置蜂鸣器的GPIO引脚
buzzer_pin = 3
GPIO.setup(buzzer_pin, GPIO.OUT)

run = True


# 定义一个函数来产生声音
def buzz(pitch, duration):
    global run
    # pitch单位为赫兹，duration单位为秒
    period = 1.0 / pitch  # 计算周期
    delay = period / 2  # 计算延迟时间
    cycles = int(duration * pitch)  # 计算循环次数
    print("period: ", period)
    print("delay: ", delay)
    print("cycles: ", cycles)
    while True:
        if not run:
            break
        GPIO.output(buzzer_pin, True)  # 设置引脚为高电平
        time.sleep(delay)  # 等待一段时间
        GPIO.output(buzzer_pin, False)  # 设置引脚为低电平
        time.sleep(delay)  # 等待一段时间
    # for i in range(cycles):
    #     GPIO.output(buzzer_pin, True)  # 设置引脚为高电平
    #     time.sleep(delay)  # 等待一段时间
    #     GPIO.output(buzzer_pin, False)  # 设置引脚为低电平
    #     time.sleep(delay)  # 等待一段时间


def stop():
    global run
    time.sleep(1)
    run = False


try:
    # 发出一个1000赫兹的声音，持续1秒
    th1 = threading.Thread(target=buzz, args=(750, 1))
    th2 = threading.Thread(target=stop)

    th1.start()
    th2.start()
    th1.join()
    th2.join()

except KeyboardInterrupt:
    print("程序被用户中断")

finally:
    GPIO.cleanup()  # 清理GPIO状态，重置所有GPIO引脚
