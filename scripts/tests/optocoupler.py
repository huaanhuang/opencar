"""
@Time: 2024/1/28 17:18
@Auth: huangdingbo
@File: optocoupler.py
@IDE: PyCharm
@DESC: 光耦模块
"""

import RPi.GPIO as GPIO
import time

# 设置GPIO模式为BCM或BOARD
GPIO.setmode(GPIO.BOARD)  # 或 GPIO.setmode(GPIO.BOARD)
# 设置光耦模块连接的GPIO引脚编号
SLOT_PIN = 5  # 请根据实际连接的GPIO引脚修改此值

# 设置GPIO引脚为输入模式，并启用内部上拉电阻
GPIO.setup(SLOT_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)

# 初始化计数器
obstruction_count = 0


# 定义回调函数
def slot_callback(channel):
    global obstruction_count
    obstruction_count += 1
    # print(obstruction_count)


# 添加事件检测，当引脚从高到低（下降沿）时调用回调函数
# 注意：如果光耦模块在遮挡时输出高电平，请使用GPIO.RISING
GPIO.add_event_detect(SLOT_PIN, GPIO.FALLING, callback=slot_callback, bouncetime=1)

# 测量转速
try:
    # 设置测量时间间隔（秒）
    measurement_interval = 1
    while True:
        # 重置遮挡次数
        obstruction_count = 0
        # 等待测量时间间隔
        time.sleep(measurement_interval)
        # 计算转速（转/秒）
        print(obstruction_count)
        speed_rpm = (obstruction_count / measurement_interval)
        print(f"Speed: {speed_rpm:.2f} RPM")
except KeyboardInterrupt:
    print("程序被用户中断")
finally:
    # 清理GPIO资源
    GPIO.cleanup()
