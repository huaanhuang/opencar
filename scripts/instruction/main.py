import json
import queue
import threading
import time
import platform
import redis

if platform.system() == "Darwin":
    class pwm(object):
        def start(self, val):
            pass

        def ChangeDutyCycle(self, val):
            pass

        def stop(self):
            pass


    class gpio(object):
        LOW = 0
        HIGH = 1
        OUT = -1
        BOARD = 2

        def setmode(self, mode):
            pass

        def setup(self, en, val):
            pass

        def output(self, en, val):
            pass

        def PWM(self, en, val):
            return pwm()

        def cleanup(self):
            pass


    GPIO = gpio()
else:
    import RPi.GPIO as GPIO

# redis 配置
RedisConfig = {
    "host": "r-2vcib6ac5f2v70202lpd.redis.cn-chengdu.rds.aliyuncs.com",
    "port": 6379,
    "db": 0,
    "password": "Hdb123456@",
}

# 档位和占空比映射
GearDutyCycleMap = {
    "1": 20,
    "2": 40,
    "3": 60,
    "4": 80,
    "5": 100,
}

# 前进或后退队列
BeforeOrAfterQueue = queue.Queue(10)

# 左或右队列
LeftOrRightQueue = queue.Queue(10)

# 档位队列
GearQueue = queue.Queue(10)

# 舵机引脚
SERVO_EN = 12
EN1 = 22
IN1 = 16
IN2 = 18
tmp = 1
EN2 = 15
IN3 = 11
IN4 = 13

GPIO.setmode(GPIO.BOARD)
GPIO.setup(EN1, GPIO.OUT)
GPIO.setup(EN1, GPIO.OUT)
GPIO.setup(IN1, GPIO.OUT)
GPIO.setup(IN2, GPIO.OUT)
GPIO.setup(SERVO_EN, GPIO.OUT)
GPIO.output(IN1, GPIO.LOW)
GPIO.output(IN2, GPIO.LOW)

pwm_gear = GPIO.PWM(EN1, 1000)
pwm_gear.start(20)

# 创建一个PWM实例，设置频率为50Hz（舵机通常使用50Hz的PWM信号）
pwm_servo = GPIO.PWM(SERVO_EN, 50)
# 启动PWM，并设置初始占空比（比如7.5是中立位置）
Degree = 7.5
pwm_servo.start(Degree)


def get_timestamp_ms():
    seconds_timestamp = time.time()
    return int(seconds_timestamp * 1000)


def sub_before_or_after():
    while True:
        msg = BeforeOrAfterQueue.get()
        print("sub_before_or_after: {}".format(msg))
        if msg.get("type", None) == "up":
            print("停止转动")
            GPIO.output(IN1, GPIO.LOW)
            GPIO.output(IN2, GPIO.LOW)
            pwm_gear.ChangeDutyCycle(20)
            continue
        if msg.get("type", None) == "down":
            key = msg.get("key", None)
            if key in ["w", "ArrowUp"]:
                print("向前转动")
                GPIO.output(IN1, GPIO.HIGH)
                GPIO.output(IN2, GPIO.LOW)
            elif key in ["s", "ArrowDown"]:
                print("向后转")
                GPIO.output(IN1, GPIO.LOW)
                GPIO.output(IN2, GPIO.HIGH)
            continue


def sub_left_or_right():
    global Degree
    while True:
        msg = LeftOrRightQueue.get()
        print("sub_left_or_right: {}".format(msg))
        if msg.get("type", None) == "down":
            key = msg.get("key", None)
            if key in ["a", "ArrowLeft"]:
                print("向左转向")
                Degree = 5 if Degree - 1 <= 5 else Degree - 1
                pwm_servo.ChangeDutyCycle(Degree)
            elif key in ["d", "ArrowRight"]:
                print("向右转向")
                Degree = 10 if Degree + 1 >= 10 else Degree + 1
                pwm_servo.ChangeDutyCycle(Degree)


def sub_gear():
    while True:
        msg = GearQueue.get()
        print("sub_gear: {}".format(msg))
        if msg.get("type", None) == "down":
            duty_cycle = GearDutyCycleMap.get(msg.get("key"), "1")
            pwm_gear.ChangeDutyCycle(duty_cycle)


def producer():
    r = redis.Redis(**RedisConfig)
    pubsub = r.pubsub()
    pubsub.subscribe('open_car')
    for message in pubsub.listen():
        if message['type'] == 'message':
            data = json.loads(message['data'].decode('utf-8'))
            delay = get_timestamp_ms() - int(data.get("timestamp", 0))
            r.set("delay", delay)
            print("当前延迟: {}ms".format(delay))
            print(f"Received: {message['data'].decode('utf-8')}")
            channel = data.get("channel", None)
            msg = {"type": data.get("type"), "key": data.get("key")}
            if channel == "before_or_after":
                BeforeOrAfterQueue.put(msg)
            elif channel == "left_or_right":
                LeftOrRightQueue.put(msg)
            elif channel == "gear":
                GearQueue.put(msg)
            else:
                print("不支持的通道")


if __name__ == '__main__':
    try:
        tasks = [
            threading.Thread(target=producer),
            threading.Thread(target=sub_before_or_after),
            threading.Thread(target=sub_left_or_right),
            threading.Thread(target=sub_gear),
        ]
        for task in tasks:
            task.start()
        for task in tasks:
            task.join()
    except Exception as e:
        print("Err: ", e)
    finally:
        pwm_servo.stop()
        pwm_gear.stop()
        GPIO.cleanup()
