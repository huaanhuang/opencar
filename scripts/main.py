import argparse
import logging
import asyncio
import uvloop
import json
import websockets
import yaml

from instruction.config import Instruction
from instruction.controller import Controller
from monitor.client import MonitorClient
from rtc.client import Client
from rtc.constraints import AnswerIdentity
from utils.log import log, init
from utils.utils import md5Entry

# 使用高效的异步循环库
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
# 设置日志级别
logging.basicConfig(level=logging.INFO)


class OpenCar(object):
    __identity: str = AnswerIdentity
    # ws 连接
    _socket = None

    # 图传客户端
    _client: Client = None

    # 控制器
    _controller: Controller = None

    # 监控
    _monitor: MonitorClient = None

    # 信令服务器地址
    _sign_url: str = None

    # 请求密钥
    _token: str = None

    def __init__(self, config: dict):
        rtc: dict = config.get("rtc", {})
        con: dict = config.get("instruction", {})
        self._sign_url = rtc.get("sign_url")
        self._token = md5Entry(rtc.get("token"))
        self._client = Client(rtc)
        self._controller = Controller(con)
        self._monitor = MonitorClient()

    async def connect_to_signaling(self):
        """
        连接到信令服务器
        :return:
        """
        async with websockets.connect(f"{self._sign_url}?token={self._token}&identity={self.__identity}") as ws:
            self._monitor.set_socket(ws)
            async for msg in ws:
                message = json.loads(msg)
                cmd = message.get("cmd")
                if cmd is not None:
                    log.info("收到消息: {}", message)
                    if cmd == "JOIN":
                        log.info("{}加入到房间", message.get("from", ""))
                    elif cmd == "OFFER":
                        await self._client.handleRemoteOffer(ws, message)
                    elif cmd == "CANDIDATE":
                        await self._client.handleRemoteCandidate(ws, message)
                    elif cmd == "LEAVE":
                        log.info("{}离开房间", message.get("from", ""))
                        await self._client.handleLeaveCmd(ws, message)
                    elif cmd == "CONTROLLER":
                        await self._controller.publish(Instruction(
                            **message.get("data", {})
                        ))
                    else:
                        log.warning("未知命令: {}", message)

    async def connect_to_controller(self):
        """
        连接到控制器
        :return:
        """
        await self._controller.run()

    async def connect_to_monitor(self):
        """
        连接到监控器
        :return:
        """
        await self._monitor.run()


async def main(config: dict):
    # 初始化日志对象
    init(config.get("log", dict()))
    server = OpenCar(config)
    # 异步运行协程对象
    await asyncio.gather(
        server.connect_to_signaling(),
        server.connect_to_controller(),
        server.connect_to_monitor(),
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='open car runtime params')
    parser.add_argument('-c', '--config', type=str, default="./config/config.yaml", help='配置文件路径')
    args = parser.parse_args()
    # 读取配置
    with open(args.config, 'r') as file:
        yaml_data = yaml.safe_load(file)
        # 运行异步事件循环
        asyncio.run(main(yaml_data))
