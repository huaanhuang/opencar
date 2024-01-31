"""
@Time: 2024/1/15 16:02
@Auth: huangdingbo
@File: config.py
@IDE: PyCharm
@DESC: 描述
"""
from dataclasses import dataclass
from typing import Union


@dataclass
class Config:
    sign_url: str
    turn_url: str
    identity: str
    user_id: str
    username: str
    room_id: str
    token: str
    video_codec: Union[str, None]
    video_file: Union[str, None]
    video_format: Union[str, None]
    video_framerate: str
    video_size: str
    audio_codec: Union[str, None]
    audio_file: Union[str, None]
    audio_format: Union[str, None]
