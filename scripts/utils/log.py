"""
@Time: 2024/1/26 11:03
@Auth: huangdingbo
@File: log.py
@IDE: PyCharm
@DESC: 描述
"""
import os
import sys
import time

from loguru import logger

log = logger


def init(config: dict = None):
    """
    初始化日志对象
    :param config:
    :return:
    """
    if config is None:
        return
    skin = config.get("sink", None)
    if skin is None:
        script_dir_path, _ = os.path.split(os.path.abspath(sys.argv[0]))
        path = config.get("path", None)  # 日志路径
        if path is None:  # 默认路口 脚本所在目录/logs/处理函数名称/
            path = os.path.join(script_dir_path, "logs")
        log_file_name = str(time.strftime("%Y%m%d", time.localtime())) + ".log"
        config["sink"] = os.path.join(path, log_file_name)

    log.add(**config)
