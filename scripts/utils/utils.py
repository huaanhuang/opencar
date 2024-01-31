"""
@Time: 2024/1/15 09:59
@Auth: huangdingbo
@File: utils.py
@IDE: PyCharm
@DESC: 工具函数
"""
import hashlib
import platform

import yaml
from aiortc import RTCIceCandidate, RTCRtpSender, MediaStreamTrack
from aiortc.contrib.media import MediaPlayer, MediaRelay
from rtc.constraints import MediaStreamConstraints
import numpy as np
import sounddevice as sd


def md5Entry(message: str):
    """
    MD5加密
    :param message:
    :return:
    """
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


class SoundDeviceStreamTrack(MediaStreamTrack):
    """
    A MediaStreamTrack that reads audio data from a sounddevice InputStream.
    """
    kind = "audio"

    def __init__(self, stream):
        super().__init__()  # don't forget this!
        self.stream = stream

    async def recv(self):
        """
        This is called when aiortc wants a frame of audio.
        """
        # Read audio data from the sounddevice InputStream
        frame, overflowed = self.stream.read(self.stream.read_available)
        if overflowed:
            print("Audio buffer has overflowed!")

        # Convert the audio data to the format aiortc expects
        # Here we assume the audio data is in float32 format
        frame = np.frombuffer(frame, dtype=np.float32)

        # aiortc expects interleaved int16 samples
        frame = (frame * 32767).astype(np.int16).tobytes()

        # Return the audio frame to aiortc
        return frame


def audio_callback(indata, frames, time, status):
    # This callback is called by sounddevice for each audio frame
    pass  # We don't need to do anything here for now


relay = None
webcam = None
microphone = None


def getUserMedia(constraints: MediaStreamConstraints):
    global relay, webcam, microphone

    if relay is None:
        if constraints.video is not None:
            webcam = MediaPlayer(
                constraints.video.file,
                format=constraints.video.format,
                options=constraints.video.options()
            )
        if constraints.audio is not None:
            # Open the audio stream with sounddevice
            audio_stream = sd.InputStream(
                device=constraints.audio.file,  # 'hw:3,0' or another device identifier
                channels=2,  # Adjust the number of channels according to your device
                callback=audio_callback,
                samplerate=48000  # Adjust the sample rate according to your device
            )
            audio_stream.start()

            # Create an instance of our custom MediaStreamTrack
            microphone = SoundDeviceStreamTrack(audio_stream)
        relay = MediaRelay()

    return None if microphone is None else relay.subscribe(microphone), \
        None if webcam is None else relay.subscribe(webcam.video)


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


def yaml_to_dataclass(path: str, dataclass: any):
    with open(path, 'r') as file:
        yaml_data = yaml.safe_load(file)
    return dataclass(**yaml_data)
