import logging
import asyncio
import hashlib
import json
import platform
import traceback
from typing import Optional, Union

import pyaudio
import websockets
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, \
    RTCIceServer, RTCIceCandidate, MediaStreamTrack, RTCRtpSender
from aiortc.contrib.media import MediaPlayer, MediaRelay, MediaStreamError
import requests

logging.basicConfig(level=logging.DEBUG)

relay = None

webcam = None

microphone = None


def md5Entry(message: str):
    md5_hash = hashlib.md5()
    md5_hash.update(message.encode('utf-8'))
    return md5_hash.hexdigest()


def force_codec(pc, sender, forced_codec):
    """
    音视频编码
    :param pc:
    :param sender:
    :param forced_codec:
    :return:
    """
    kind = forced_codec.split("/")[0]
    codecs = RTCRtpSender.getCapabilities(kind).codecs
    transceiver = next(t for t in pc.getTransceivers() if t.sender == sender)
    transceiver.setCodecPreferences(
        [codec for codec in codecs if codec.mimeType == forced_codec]
    )

def create_local_tracks(play_from, decode):
    global relay, webcam

    if play_from:
        player = MediaPlayer(play_from, decode=decode)
        return player.audio, player.video
    else:
        options = {"framerate": "30", "video_size": "640x480"}
        if relay is None:
            if platform.system() == "Darwin":
                webcam = MediaPlayer(
                    "default:none", format="avfoundation", options=options
                )
            elif platform.system() == "Windows":
                webcam = MediaPlayer(
                    "video=Integrated Camera", format="dshow", options=options
                )
            else:
                webcam = MediaPlayer("/dev/video0", format="v4l2", options=options)
            relay = MediaRelay()
        return None, relay.subscribe(webcam.video)


def js_candidate_to_python_candidate(js_candidate: dict) -> RTCIceCandidate:
    """
    :param js_candidate: {'candidate': 'candidate:364225002 1 udp 2122260223 10.35.1.115 57323 typ host generation 0 ufrag hcbv network-id 1 network-cost 10', 'sdpMLineIndex': 0, 'sdpMid': '0'}
    :return:
    """
    # 解析 candidate 字符串以获取各个字段
    candidate_parts = js_candidate['candidate'].split()

    # 创建一部字典来存储解析出来的字段
    candidate_fields = {
        'foundation': candidate_parts[0].split(':')[1],
        'component': int(candidate_parts[1]),
        'protocol': candidate_parts[2],
        'priority': int(candidate_parts[3]),
        'ip': candidate_parts[4],
        'port': int(candidate_parts[5]),
        'type': candidate_parts[7],
        # 可选字段，可能需要根据实际情况进行解析
        'relatedAddress': None,
        'relatedPort': None,
        'tcpType': None
    }

    # 检查是否有相关地址和端口
    if 'raddr' in candidate_parts and 'rport' in candidate_parts:
        candidate_fields['relatedAddress'] = candidate_parts[candidate_parts.index('raddr') + 1]
        candidate_fields['relatedPort'] = int(candidate_parts[candidate_parts.index('rport') + 1])

    # 检查是否有 TCP 类型
    if candidate_fields['protocol'].lower() == 'tcp' and 'tcptype' in candidate_parts:
        candidate_fields['tcpType'] = candidate_parts[candidate_parts.index('tcptype') + 1]

    # 创建 RTCIceCandidate 对象
    return RTCIceCandidate(
        foundation=candidate_fields['foundation'],
        component=candidate_fields['component'],
        protocol=candidate_fields['protocol'],
        priority=candidate_fields['priority'],
        ip=candidate_fields['ip'],
        port=candidate_fields['port'],
        type=candidate_fields['type'],
        relatedAddress=candidate_fields['relatedAddress'],
        relatedPort=candidate_fields['relatedPort'],
        tcpType=candidate_fields['tcpType'],
        sdpMid=js_candidate.get('sdpMid'),
        sdpMLineIndex=js_candidate.get('sdpMLineIndex')
    )


DefaultConfiguration = RTCConfiguration(iceServers=[
    RTCIceServer(
        urls="stun:stun.l.google.com:19302",
    )
])


class ImageTransmissionServer(object):
    # 信令服务器地址
    _signaling_url: str = "ws://192.168.101.60:8082/ws"

    # 身份
    _identity: str = "answer"

    # 用户ID
    _user_id: str = ""

    # 用户名
    _username: str = ""

    # 房间ID
    _room_id: str = ""

    # 会话ID
    _session_id: str = ""

    # ws 连接
    _socket = None

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

    # 访问密钥
    _token: str = None

    # 视频编码
    _video_codec: str = None

    # 音频编码
    _audio_codec: str = None

    # 音频播放器
    _pyaudio_instance = None

    # 音频流
    _audio_stream = None

    def __init__(self):
        self._pyaudio_instance = pyaudio.PyAudio()
        self._token = md5Entry("Hdb378969398.@")
        self._user_id = "answer001"
        self._username = "pi"
        self._room_id = "001"
        self._session_id = "000-000"
        # 获取ICE配置
        rsp = requests.get("http://192.168.101.60:8082/turn?service=turn&username=sample", headers={
            "Token": self._token
        }).json()
        if int(rsp["code"]) == 0:
            data = rsp.get("data", {})
            # self._configuration = RTCConfiguration(iceServers=[
            #     RTCIceServer(
            #         urls=",".join(data.get("uris", [])),
            #         username=data.get("username", ""),
            #         credential=data.get("password", ""),
            #     )
            # ])
            self._configuration = RTCConfiguration(iceServers=[
                RTCIceServer(
                    urls="turn:127.0.0.1:19302?transport=udp",
                    username=data.get("username", ""),
                    credential=data.get("password", ""),
                ),
                # RTCIceServer(
                #     urls="stun:127.0.0.1:19302",
                # )
            ])
        print("当前ICE配置: {}".format(self._configuration))

    async def connect_to_signaling(self):
        async with websockets.connect(f"{self._signaling_url}?token={self._token}") as ws:
            await self.signaling(ws)

    async def signaling(self, ws):
        # 加入房间
        await ws.send(json.dumps({
            "type": "joinRoom",
            "data": {
                "id": self._user_id,
                "name": self._username,
                "roomId": self._room_id,
                "identity": self._identity,
            }
        }))
        # 信令戳
        async for message in ws:
            msg = json.loads(message)
            msg_type = msg.get("type")
            data = msg.get("data", {})
            if msg_type != "heartPackage":
                print(f"收到消息: {msg}")
            if msg_type == "offer":
                if self._is_calling:
                    print(f"正在通话中....")
                    return
                await self._on_offer(data, ws)
            elif msg_type == "candidate":
                await self._on_candidate(data)
            elif msg_type == "hangUp":
                await self._on_hangup(data)
                print(f"会话结束: {data.get('sessionId')}")
            elif msg_type == "leaveRoom":
                await self._on_hangup({})
            elif msg_type == "heartPackage":
                pass

    async def _on_offer(self, data: dict, ws):
        """
        处理提议方发过来的Offer
        :param data:
        :param ws:
        :return:
        """
        try:
            # 标记为正在通话
            self._is_calling = True
            # 会话ID
            self._session_id = data.get("sessionId")
            # 初始化RTCPeerConnection
            self._pc = RTCPeerConnection(self._configuration)
            # 音频传输方向
            self._pc.addTransceiver("audio", direction="sendrecv")
            # 视频传输方向
            self._pc.addTransceiver("video", direction="sendonly")
            print(f"开始会话: {self._session_id}")

            self._pc.on("connectionstatechange")

            async def on_connectionstatechange():
                print("Connection state is %s" % self._pc.connectionState)
                if self._pc.connectionState == "failed":
                    await self._pc.close()

            @self._pc.on("track")
            async def on_track(track: MediaStreamTrack):
                print(f'Received remote track: {track.kind}')
                if track.kind == "audio":
                    # 设置 PyAudio 流参数
                    self._audio_stream = self._pyaudio_instance.open(
                        format=pyaudio.paInt16,
                        channels=1,
                        rate=48000,  # 或者使用 track.codec.clockRate
                        output=True,
                        frames_per_buffer=1600
                    )
                    # 从远端音频轨道读取音频帧并播放
                    try:
                        while True:
                            frame = await track.recv()
                            self._audio_stream.write(frame.planes[0].to_bytes())
                    except MediaStreamError:
                        # 远端轨道结束
                        print("远端音频轨道结束")
                    finally:
                        self._audio_stream.stop_stream()
                        self._audio_stream.close()
                        self._audio_stream = None

            @self._pc.on("ended")
            async def on_ended(track: MediaStreamTrack):
                print(f'Remote track {track.kind} ended')

            # 获取本地媒体流
            audio, video = create_local_tracks(False, None)
            if audio:
                self._local_audio_track = self._pc.addTrack(audio)
                if self._audio_codec:
                    force_codec(self._pc, self._local_audio_track, self._audio_codec)
            if video:
                self._local_video_track = self._pc.addTrack(video)
                if self._video_codec:
                    force_codec(self._pc, self._local_video_track, self._video_codec)

            # 设置远端会话描述SDP
            desc = data.get("description", {})
            await self._pc.setRemoteDescription(RTCSessionDescription(
                sdp=desc.get("sdp", ""),
                type=desc.get("type", ""),
            ))
            if self._pc.remoteDescription.type == "offer":
                answer = await self._pc.createAnswer()
                await self._pc.setLocalDescription(answer)
                await ws.send(json.dumps({
                    "type": "answer",
                    "data": {
                        "to": data.get("from"),
                        "from": self._user_id,
                        "description": {"sdp": self._pc.localDescription.sdp, "type": self._pc.localDescription.type},
                        "sessionId": self._session_id,
                        "roomId": self._room_id,
                    }
                }))
        except Exception as e:
            await self._on_hangup({})
            print(f"处理提议方发过来的Offer失败: {str(e)}")
            print(traceback.format_exc())
            self._is_calling = False
            self._session_id = ""

    async def _on_candidate(self, data: dict):
        """
        接收到对方发过来的Candidate信息
        :param data:
        :return:
        """
        print(">>>>>>>>>>>>>_on_candidate: ", data["candidate"])
        await self._pc.addIceCandidate(js_candidate_to_python_candidate(data["candidate"]))

    async def _on_hangup(self, data: dict):
        """
        挂断
        :param data:
        :return:
        """
        if self._local_audio_track:
            await self._local_audio_track.stop()
            self._local_audio_track = None
        if self._local_video_track:
            await self._local_video_track.stop()
            self._local_video_track = None
        if self._pc:
            await self._pc.close()
            self._pc = None
        if self._audio_stream:
            self._audio_stream.stop_stream()
            self._audio_stream.close()
            self._audio_stream = None

        self._is_calling = False
        self._session_id = ""


async def main():
    server = ImageTransmissionServer()
    await server.connect_to_signaling()


if __name__ == "__main__":
    # 运行异步事件循环
    asyncio.run(main())
