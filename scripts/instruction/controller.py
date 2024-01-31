"""
@Time: 2024/1/15 18:13
@Auth: huangdingbo
@File: controller.py
@IDE: PyCharm
@DESC: 控制器
"""
import asyncio
import json
import logging
import math
import platform
import time
from asyncio import Queue

from instruction.config import Config, Instruction

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


class Controller(object):
    # 控制器配置
    _config: Config = None

    # 前进/后退指令队列
    _bf_queue: Queue = None

    # 左转/右转指令队列
    _lr_queue: Queue = None

    # 档位指令
    _gear_queue: Queue = None

    # 鸣笛指令
    _beep_queue: Queue = None

    # 云台指令
    _ptz_queue: Queue = None

    # 初始档位
    _init_gear: int = None

    # 初始舵机位置
    _servo_degree: float = 7.5

    # 前驱电机功率
    _pre_pwm = None

    # 后驱电机功率
    _end_pwm = None

    # 舵机占空比
    _servo_pwm = None

    # 云台x
    _servo_x_pwm = None

    _servo_x_degree: float = 7.5

    # 云台y
    _servo_y_pwm = None

    _servo_y_degree: float = 7.5

    # 是否鸣笛
    _beep_run = True

    # 蜂鸣器延迟时间
    _delay: float = None

    # 用于存储鸣笛任务的变量
    _beep_task = None

    def __init__(self, config: dict):
        try:
            GPIO.cleanup()
        except Exception as e:
            pass
        # 初始化配置
        self._config = Config(**config)
        self._bf_queue = Queue(10)
        self._lr_queue = Queue(10)
        self._gear_queue = Queue(10)
        self._beep_queue = Queue(10)
        self._ptz_queue = Queue(10)
        # 初始化档位
        self._init_gear = self._config.gear_duty_cycle_map.get("1", 60)
        # 初始化引脚
        GPIO.setmode(GPIO.BOARD)
        # 舵机
        GPIO.setup(self._config.servo_pwm, GPIO.OUT)
        # 前驱
        GPIO.setup(self._config.pre_pwm, GPIO.OUT)
        GPIO.setup(self._config.pre_in, GPIO.OUT)
        GPIO.setup(self._config.pre_out, GPIO.OUT)
        # 后驱
        GPIO.setup(self._config.end_pwm, GPIO.OUT)
        GPIO.setup(self._config.end_in, GPIO.OUT)
        GPIO.setup(self._config.end_out, GPIO.OUT)
        # 蜂鸣器
        GPIO.setup(self._config.buzzer_pin, GPIO.OUT)
        self._delay = (1.0 / self._config.pitch) / 2
        # 二自由度舵机
        GPIO.setup(self._config.servo_x_pwm, GPIO.OUT)
        GPIO.setup(self._config.servo_y_pwm, GPIO.OUT)
        # 前大灯
        GPIO.setup(self._config.headlights, GPIO.OUT)
        # 刹车灯
        GPIO.setup(self._config.brake_light, GPIO.OUT)
        # 左转向灯
        GPIO.setup(self._config.left_turn_signal, GPIO.OUT)
        # 右转向灯
        GPIO.setup(self._config.right_turn_signal, GPIO.OUT)
        # 设置默认值
        GPIO.setup(self._config.pre_in, GPIO.LOW)
        GPIO.setup(self._config.pre_out, GPIO.LOW)
        GPIO.setup(self._config.end_in, GPIO.LOW)
        GPIO.setup(self._config.end_out, GPIO.LOW)
        self._pre_pwm = GPIO.PWM(self._config.pre_pwm, 1000)
        self._pre_pwm.start(self._init_gear)
        self._end_pwm = GPIO.PWM(self._config.end_pwm, 1000)
        self._end_pwm.start(self._init_gear)
        self._servo_pwm = GPIO.PWM(self._config.servo_pwm, 50)
        self._servo_pwm.start(self._servo_degree)
        # time.sleep(0.1)
        # self._servo_pwm.ChangeDutyCycle(0)
        self._servo_x_pwm = GPIO.PWM(self._config.servo_x_pwm, 50)
        self._servo_x_pwm.start(self._servo_x_degree)
        time.sleep(0.1)
        self._servo_x_pwm.ChangeDutyCycle(0)
        self._servo_y_pwm = GPIO.PWM(self._config.servo_y_pwm, 50)
        self._servo_y_pwm.start(self._servo_y_degree)
        time.sleep(0.1)
        self._servo_y_pwm.ChangeDutyCycle(0)
        # 前大灯常亮
        GPIO.output(self._config.headlights, GPIO.HIGH)
        GPIO.output(self._config.brake_light, GPIO.HIGH)
        GPIO.output(self._config.left_turn_signal, GPIO.LOW)
        GPIO.output(self._config.right_turn_signal, GPIO.LOW)

    async def publish(self, ins: Instruction):
        """
        发布指令
        :param ins:
        :return:
        """
        if ins.channel == "bf":
            await self._bf_queue.put(ins)
        elif ins.channel == "lr":
            await self._lr_queue.put(ins)
        elif ins.channel == "gear":
            await self._gear_queue.put(ins)
        elif ins.channel == "beep":
            await self._beep_queue.put(ins)
        elif ins.channel == "ptz":
            await self._ptz_queue.put(ins)
        else:
            logging.warning(f"不支持的指令通道: {ins}")

    async def _subscribe_bf(self):
        """
        订阅前进/后退通道
        :return:
        """
        while True:
            ins = await self._bf_queue.get()
            if ins.type == "down":
                if ins.key in ["w", "ArrowUp"]:
                    logging.info("向前运动...")
                    GPIO.output(self._config.pre_in, GPIO.HIGH)
                    GPIO.output(self._config.pre_out, GPIO.LOW)
                    GPIO.output(self._config.end_in, GPIO.HIGH)
                    GPIO.output(self._config.end_out, GPIO.LOW)
                elif ins.key in ["s", "ArrowDown"]:
                    logging.info("向后运动")
                    GPIO.output(self._config.pre_in, GPIO.LOW)
                    GPIO.output(self._config.pre_out, GPIO.HIGH)
                    GPIO.output(self._config.end_in, GPIO.LOW)
                    GPIO.output(self._config.end_out, GPIO.HIGH)
                # 关闭刹车灯
                GPIO.output(self._config.brake_light, GPIO.LOW)
            else:
                logging.info("停止运动...")
                # 前轮
                GPIO.output(self._config.pre_in, GPIO.LOW)
                GPIO.output(self._config.pre_out, GPIO.LOW)
                # self._pre_pwm.ChangeDutyCycle(self._init_gear)
                # 后轮
                GPIO.output(self._config.end_in, GPIO.LOW)
                GPIO.output(self._config.end_out, GPIO.LOW)
                # self._end_pwm.ChangeDutyCycle(self._init_gear)
                # 打开刹车灯
                GPIO.output(self._config.brake_light, GPIO.HIGH)

    async def _subscribe_lr(self):
        """
        订阅左转/右转通道
        :return:
        """
        while True:
            ins = await self._lr_queue.get()
            if ins.type == "down":
                if ins.key in ["a", "ArrowLeft"]:
                    logging.info("向左转动...")
                    self._servo_degree = 11 if self._servo_degree + 1 >= 11 else self._servo_degree + 1
                    self._servo_pwm.ChangeDutyCycle(self._servo_degree)
                    # 打开左转向灯
                    GPIO.output(self._config.left_turn_signal, GPIO.HIGH)
                elif ins.key in ["d", "ArrowRight"]:
                    logging.info("向右转动...")
                    self._servo_degree = 4.5 if self._servo_degree - 1 <= 4.5 else self._servo_degree - 1
                    self._servo_pwm.ChangeDutyCycle(self._servo_degree)
                    # 打开右转向灯
                    GPIO.output(self._config.right_turn_signal, GPIO.HIGH)
            else:
                # 关闭舵机pwm信号
                # await asyncio.sleep(0.1)
                # self._servo_pwm.ChangeDutyCycle(0)
                # 关闭转向灯
                if ins.key in ["a", "ArrowLeft"]:
                    # 关闭左转向灯
                    GPIO.output(self._config.left_turn_signal, GPIO.LOW)
                elif ins.key in ["d", "ArrowRight"]:
                    # 关闭右转向灯
                    GPIO.output(self._config.right_turn_signal, GPIO.LOW)

    async def _subscribe_gear(self):
        """
        订阅档位通道
        :return:
        """
        while True:
            ins = await self._gear_queue.get()
            duty_cycle = str(self._config.gear_duty_cycle_map.get(int(ins.key), 1))
            logging.info(f"切换档位: {ins.key}@{duty_cycle}")
            self._pre_pwm.ChangeDutyCycle(int(duty_cycle))
            self._end_pwm.ChangeDutyCycle(int(duty_cycle))

    async def _subscribe_beep(self):
        """
        订阅鸣笛通道
        :return:
        """
        while True:
            ins = await self._beep_queue.get()
            if ins.type == "down":
                print("开始鸣笛...")
                if self._beep_task is None or self._beep_task.done():
                    self._beep_task = asyncio.create_task(self._do_start_beep())
            else:
                print("结束鸣笛...")
                if self._beep_task and not self._beep_task.done():
                    self._beep_task.cancel()  # 取消鸣笛任务
                    await self._do_stop_beep()  # 确保蜂鸣器关闭

    async def _subscribe_ptz(self):
        """
        订阅云台转向
        :return:
        """
        while True:
            ins = await self._ptz_queue.get()
            data = json.loads(ins.key)
            if abs(data.get("x", 0)) > 0:
                x_degree = int(data["x"])
                self._servo_x_degree = round(self._servo_x_degree + (x_degree * 0.05), 2)
                if self._servo_x_degree <= 2.5:
                    self._servo_x_degree = 2.5
                if self._servo_x_degree >= 12.5:
                    self._servo_x_degree = 12.5
                self._servo_x_pwm.ChangeDutyCycle(self._servo_x_degree)
                await asyncio.sleep(0.1)
                self._servo_x_pwm.ChangeDutyCycle(0)

            if abs(data.get("y", 0)) > 0:
                y_degree = int(data["y"])
                self._servo_y_degree = round(self._servo_y_degree + (y_degree * 0.05), 2)
                if self._servo_y_degree <= 4:
                    self._servo_y_degree = 4
                if self._servo_y_degree >= 11:
                    self._servo_y_degree = 11
                self._servo_y_pwm.ChangeDutyCycle(self._servo_y_degree)
                await asyncio.sleep(0.1)
                self._servo_y_pwm.ChangeDutyCycle(0)

    async def _do_start_beep(self):
        try:
            while True:
                GPIO.output(self._config.buzzer_pin, True)  # 设置引脚为高电平
                await asyncio.sleep(self._delay)  # 异步等待一段时间
                GPIO.output(self._config.buzzer_pin, False)  # 设置引脚为低电平
                await asyncio.sleep(self._delay)  # 异步等待一段时间
        except asyncio.CancelledError:
            # 如果任务被取消，确保蜂鸣器关闭
            GPIO.output(self._config.buzzer_pin, False)

    async def _do_stop_beep(self):
        GPIO.output(self._config.buzzer_pin, False)  # 确保蜂鸣器关闭

    async def run(self):
        try:
            tasks = [
                asyncio.create_task(self._subscribe_bf()),
                asyncio.create_task(self._subscribe_lr()),
                asyncio.create_task(self._subscribe_gear()),
                asyncio.create_task(self._subscribe_beep()),
                asyncio.create_task(self._subscribe_ptz()),
            ]
            await asyncio.gather(*tasks)
        except Exception as e:
            logging.error(f"Controller Run Err: {str(e)}")
        finally:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, self._pre_pwm.stop)
            await loop.run_in_executor(None, self._end_pwm.stop)
            await loop.run_in_executor(None, self._servo_pwm.stop)
            await loop.run_in_executor(None, GPIO.cleanup)
