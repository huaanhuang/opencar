"""
@Time: 2024/1/23 15:23
@Auth: huangdingbo
@File: client.py
@IDE: PyCharm
@DESC: 描述
"""
import asyncio
import json
import platform
import random
import time
from concurrent.futures import ThreadPoolExecutor

from websockets.legacy.client import WebSocketClientProtocol
import psutil
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
        IN = None
        PUD_UP = None

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

class MonitorClient(object):
    _socket: WebSocketClientProtocol = None
    _interval: int = None
    # 光耦传感器引脚
    _optocoupler: int = 5
    # 计数器
    _obstruction_count = 0
    # 设置测量时间间隔（秒）
    _measurement_interval = 0.2

    def __init__(self, interval: int = 3):
        self._interval = interval
        # self._event = asyncio.Event()  # 创建一个Event对象

    def set_socket(self, socket: WebSocketClientProtocol):
        self._socket = socket

    async def run(self):
        tasks = [
            asyncio.create_task(self._send_monitor_info()),
            asyncio.create_task(self._send_car_run_info()),
        ]
        await asyncio.gather(*tasks)

    async def _send_monitor_info(self):
        with ThreadPoolExecutor(max_workers=10) as executor:
            while True:
                if self._socket is not None and not self._socket.closed:
                    loop = asyncio.get_event_loop()
                    # 使用线程池执行阻塞操作
                    net_io_start = await loop.run_in_executor(executor, psutil.net_io_counters)
                    bytes_sent_start = net_io_start.bytes_sent  # 发送
                    bytes_recv_start = net_io_start.bytes_recv  # 接收

                    # CPU使用率
                    cpu_usage = await loop.run_in_executor(executor, psutil.cpu_percent, self._interval)

                    # CPU核心数
                    cpu_cores = psutil.cpu_count(logical=False)

                    # 内存信息
                    memory = await loop.run_in_executor(executor, psutil.virtual_memory)
                    memory_total = memory.total
                    memory_used = memory.used
                    memory_percent = memory.percent

                    # 磁盘信息
                    disk = await loop.run_in_executor(executor, psutil.disk_usage, '/')
                    disk_total = disk.total
                    disk_used = disk.used
                    disk_percent = disk.percent

                    # 获取所有进程信息
                    processes = await loop.run_in_executor(executor, list, psutil.process_iter(
                        ['pid', 'name', 'cpu_percent', 'memory_percent']))

                    # 处理进程信息
                    processed_processes = []
                    for proc in processes:
                        try:
                            process_info = {
                                "pid": proc.info['pid'],
                                "name": proc.info['name'],
                                "cpu_percent": 0.0 if proc.info['cpu_percent'] is None else round(
                                    proc.info['cpu_percent'], 2),
                                "memory_percent": 0.0 if proc.info['memory_percent'] is None else round(
                                    proc.info['memory_percent'], 2)
                            }
                            processed_processes.append(process_info)
                        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                            pass

                    # 根据CPU占比排序
                    top_cpu_processes = sorted(processed_processes, key=lambda x: x['cpu_percent'], reverse=True)[:5]
                    # 根据内存占比排序
                    top_memory_processes = sorted(processed_processes, key=lambda x: x['memory_percent'], reverse=True)[
                                           :5]

                    # 网络流量信息
                    net_io_end = await loop.run_in_executor(executor, psutil.net_io_counters)
                    bytes_sent_end = net_io_end.bytes_sent
                    bytes_recv_end = net_io_end.bytes_recv

                    # 发送统计数据
                    await self._socket.send(json.dumps({
                        "cmd": "MONITOR",
                        "from": "ANSWER",
                        "to": "OFFER",
                        "data": {
                            "net_io": {  # 网络流量信息
                                "timestamp": int(time.time()),  # 当前时间戳
                                "total_bytes_sent": bytes_sent_end,  # 总发送
                                "total_bytes_recv": bytes_recv_end,  # 总接收
                                "moment_bytes_sent": bytes_sent_end - bytes_sent_start,  # 瞬时发送
                                "moment_bytes_recv": bytes_recv_end - bytes_recv_start,  # 瞬时接收
                            },
                            "cpu": {
                                "usage": cpu_usage,  # cpu使用百分比
                                "cores": cpu_cores,  # cpu核心数
                            },
                            "memory": {
                                "total": memory_total,  # 总内存
                                "used": memory_used,  # 已使用
                                "usage": memory_percent,  # 使用百分比
                            },
                            "disk": {
                                "total": disk_total,
                                "used": disk_used,
                                "usage": disk_percent,
                            },
                            "top_cpu_processes": top_cpu_processes,
                            "top_memory_processes": top_memory_processes,
                        }
                    }))
                else:
                    await asyncio.sleep(1)

    def slot_callback(self, channel):
        """
        定义光耦模块回调函数
        :param channel:
        :return:
        """
        self._obstruction_count += 1

    async def _send_car_run_info(self):
        """
        发送小车运行时信息: 电机转速、行驶速度
        轮子周长: 30cm
        电机转速单位: 百转
        :return:
        """
        # try:
        #     GPIO.cleanup()
        # except Exception as e:
        #     pass
        # GPIO.setmode(GPIO.BOARD)
        # # 设置GPIO引脚为输入模式，并启用内部上拉电阻
        # GPIO.setup(self._optocoupler, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        # # 初始化计数器
        # self._obstruction_count = 0
        # # 添加事件检测，当引脚从高到低（下降沿）时调用回调函数
        # # 注意：如果光耦模块在遮挡时输出高电平，请使用GPIO.RISING
        # GPIO.add_event_detect(self._optocoupler, GPIO.FALLING, callback=self.slot_callback, bouncetime=1)

        GPIO.setmode(GPIO.BOARD)
        GPIO.setup(self._optocoupler, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.add_event_detect(self._optocoupler, GPIO.FALLING, callback=self.slot_callback, bouncetime=1)

        while True:
            # 重置遮挡次数
            self._obstruction_count = 0
            # 等待测量时间间隔
            await asyncio.sleep(self._measurement_interval)
            # 计算转速（转/秒）
            speed_rpm = self._obstruction_count / self._measurement_interval

            if self._socket is not None and not self._socket.closed:
                rotational_speed = round((35.67 * speed_rpm) / 100 * 5, 2)
                if 0 < rotational_speed <= 15:
                    gear = 1
                elif 15 < rotational_speed <= 20:
                    gear = 2
                elif 24 < rotational_speed <= 28:
                    gear = 3
                elif 28 < rotational_speed <= 30:
                    gear = 4
                elif 30 < rotational_speed <= 100:
                    gear = 5
                else:
                    gear = 0
                # print(f"rotational_speed: {round((35.67 * speed_rpm) / 100 * 5, 2)}")
                # print(f"driving_speed: {round((30 * speed_rpm) / 10 * 5, 0)}")
                await self._socket.send(json.dumps({
                    "cmd": "RUN_INFO",
                    "from": "ANSWER",
                    "to": "OFFER",
                    "data": {
                        "rotational_speed": rotational_speed,  # 电机转速
                        "driving_speed": round((30 * speed_rpm) / 10 * 5, 0),  # 行驶速度 dm/s
                        "gear": gear,  # 档位
                    }
                }))
