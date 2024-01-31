"""
@Time: 2024/1/15 15:42
@Auth: huangdingbo
@File: client.py
@IDE: PyCharm
@DESC: 描述
"""
import json
from typing import Optional, Union
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, \
    RTCIceServer
from rtc.config import Config
from rtc.constraints import MediaStreamConstraints, VideoOption, AudioOption
from utils.log import log
from utils.utils import md5Entry, getUserMedia, force_codec, js_candidate_to_python_candidate
import requests

DefaultConfiguration = RTCConfiguration(iceServers=[
    RTCIceServer(
        urls="stun:stun.l.google.com:19302",
    )
])


class Client(object):
    _config: Config = None

    # ice配置
    _configuration: Optional[RTCConfiguration] = DefaultConfiguration

    # 本地视频流
    _local_video_track = None

    # 本地音频流
    _local_audio_track = None

    # RTCPeerConnection
    _pc: Union[RTCPeerConnection, None] = None

    # 是否正在进行会话
    _is_calling: bool = False

    def __init__(self, config: dict):
        # 解析配置文件
        self._config = Config(**config)
        self._config.token = md5Entry(self._config.token)

        # 请求ICE配置
        rsp = requests.get(self._config.turn_url, headers={
            "Token": self._config.token
        }).json()
        if int(rsp["code"]) == 0:
            data = rsp.get("data", {})
            turn: dict = data.get("turn", {})
            stun: dict = data.get("stun", {})
            self._configuration = RTCConfiguration(iceServers=[
                RTCIceServer(
                    urls=",".join(turn.get("uris", [])),
                    username=turn.get("username", ""),
                    credential=turn.get("password", ""),
                ),
                RTCIceServer(
                    urls=",".join(stun.get("uris", [])),
                )
            ])
        log.info("当前ICE配置: {}".format(self._configuration))

    async def handleRemoteOffer(self, ws, msg):
        self._pc = RTCPeerConnection(self._configuration)
        # 获取本地媒体流
        audio, video = getUserMedia(MediaStreamConstraints(
            video=VideoOption(
                file=self._config.video_file,
                format=self._config.video_format,
                framerate=self._config.video_framerate,
                video_size=self._config.video_size,
            ),
            audio=None,
            # audio=AudioOption(
            #     file=self._config.audio_file,
            #     format=self._config.audio_format,
            # )
        ))
        if audio is not None:
            self._local_audio_track = self._pc.addTrack(audio)
            if self._config.audio_codec:
                force_codec(self._pc, self._local_audio_track, self._config.audio_codec)
        if video is not None:
            self._local_video_track = self._pc.addTrack(video)
            if self._config.video_codec:
                force_codec(self._pc, self._local_video_track, self._config.video_codec)

        desc = msg.get("data", {})
        await self._pc.setRemoteDescription(RTCSessionDescription(
            sdp=desc.get("sdp", ""),
            type=desc.get("type", ""),
        ))

        answer = await self._pc.createAnswer()
        await self._pc.setLocalDescription(answer)

        # aiortc 不使用 icecandidate 事件，而是将候选信息直接包含在SDP中
        send_msg = json.dumps({
            "cmd": "ANSWER",
            "from": "ANSWER",
            "to": "OFFER",
            "data": {"sdp": self._pc.localDescription.sdp, "type": self._pc.localDescription.type}
        })
        print(f"发送消息: {send_msg}")
        await ws.send(send_msg)

    async def handleRemoteCandidate(self, ws, message):
        await self._pc.addIceCandidate(js_candidate_to_python_candidate(message["data"]))

    async def handleLeaveCmd(self, ws, message):
        if self._local_audio_track:
            await self._local_audio_track.stop()
            self._local_audio_track = None
        if self._local_video_track:
            await self._local_video_track.stop()
            self._local_video_track = None
        if self._pc:
            await self._pc.close()
            self._pc = None
        self._is_calling = False
