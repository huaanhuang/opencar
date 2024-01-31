"""
@Time: 2024/1/15 10:43
@Auth: huangdingbo
@File: constraints.py
@IDE: PyCharm
@DESC: 音视频约束条件
"""
import platform
from dataclasses import dataclass
from typing import Union


@dataclass
class Option:
    file: str = None

    format: str = None


@dataclass
class VideoOption(Option):
    """
    视频约束条件
    """

    # 设置视频的大小，例如'640x480'
    video_size: str = None

    # 设置视频的帧率，例如'30'
    framerate: str = None

    # 指定编解码器，例如'h264'
    codec: str = None

    # 设置编码器预设，例如'fast'、'slow'等
    preset: str = None

    # 优化编码器设置，例如'zerolatency'用于减少编码延迟
    tune: str = None

    # 设置比特率，例如'500k'表示500千比特每秒
    bit_rate: str = None

    # 设置RTSP流的传输协议，例如'tcp'或'udp'
    rtsp_transport: str = None

    # 设置网络流的超时时间（以微秒为单位）
    stimeout: str = None

    def options(self) -> dict:
        file = ""
        formate = ""
        if platform.system() == "Darwin":
            file = "default:none"
            formate = "avfoundation"
        elif platform.system() == "Windows":
            file = "video=Integrated Camera"
            formate = "dshow"
        elif platform.system() == "Linux":
            file = "/dev/video0"
            formate = "v4l2"
        if self.file is None:
            self.file = file
        if self.format is None:
            self.format = formate
        ret = {}
        if self.video_size:
            ret["video_size"] = self.video_size
        if self.framerate:
            ret["framerate"] = self.framerate
        if self.codec:
            ret["codec"] = self.codec
        if self.preset:
            ret["preset"] = self.preset
        if self.tune:
            ret["preset"] = self.preset
        if self.bit_rate:
            ret["bit_rate"] = self.bit_rate
        if self.rtsp_transport:
            ret["rtsp_transport"] = self.rtsp_transport
        if self.stimeout:
            ret["stimeout"] = self.stimeout
        return ret


@dataclass
class AudioOption(Option):
    channels: str = None
    rate: str = None

    def options(self):
        file = ""
        formate = ""
        if platform.system() == "Darwin":
            file = "none:default"
            formate = "avfoundation"
        elif platform.system() == "Windows":
            file = "audio=Microphone (Your Microphone Name)"
            formate = "dshow"
        elif platform.system() == "Linux":
            file = "hw:2,0"
            formate = "alsa"
        if self.file is None:
            self.file = file
        if self.format is None:
            self.format = formate
        ret = {}
        if self.channels:
            ret["channels"] = self.channels
        if self.rate:
            ret["rate"] = self.rate
        return ret


@dataclass
class MediaStreamConstraints:
    """
    约束条件
    """

    video: Union[VideoOption, None]

    audio: Union[AudioOption, None]


OfferIdentity: str = "OFFER"
AnswerIdentity: str = "ANSWER"
