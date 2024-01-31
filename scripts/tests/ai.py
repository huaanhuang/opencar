"""
@Time: 2024/1/16 10:14
@Auth: huangdingbo
@File: ai.py
@IDE: PyCharm
@DESC: 聊天机器人
"""
import asyncio
import copy
import gzip
import json
import time
import uuid
from queue import Queue
import requests

import pyaudio
import websockets

MESSAGE_TYPES = {11: "audio-only server response", 12: "frontend server response", 15: "error message from server"}
MESSAGE_TYPE_SPECIFIC_FLAGS = {0: "no sequence number", 1: "sequence number > 0",
                               2: "last message from server (seq < 0)", 3: "sequence number < 0"}
MESSAGE_SERIALIZATION_METHODS = {0: "no serialization", 1: "JSON", 15: "custom type"}
MESSAGE_COMPRESSIONS = {0: "no compression", 1: "gzip", 15: "custom compression method"}

appid = "3201968238"
token = "Yn4GVGkZWqMgf-M297_jSYLXf9hBuNyN"
cluster = "volcano_tts"
voice_type = "BV221_streaming"
host = "openspeech.bytedance.com"
api_url = f"wss://{host}/api/v1/tts/ws_binary"
default_header = bytearray(b'\x11\x10\x11\x00')
request_json = {
    "app": {
        "appid": appid,
        "token": "Yn4GVGkZWqMgf-M297_jSYLXf9hBuNyN",
        "cluster": cluster
    },
    "user": {
        "uid": "2100495457"
    },
    "audio": {
        # "voice_type": "BV700_V2_streaming",
        "voice_type": voice_type,
        "encoding": "pcm",
        "compression_rate": 1,
        "rate": 24000,
        "bits": 16,
        "channel": 1,
        "speed_ratio": 1.0,
        "volume_ratio": 1.0,
        "pitch_ratio": 1.0,
        "emotion": "happy",
        "language": "cn"
    },
    "request": {
        "reqid": str(int(time.time())),
        "text": "字节跳动语音合成。",
        "text_type": "plain",
        "operation": "submit"
    }
}


def full_client_request(msg: str) -> bytearray:
    submit_request_json = copy.deepcopy(request_json)
    submit_request_json["audio"]["voice_type"] = voice_type
    submit_request_json["request"]["reqid"] = str(uuid.uuid4())
    submit_request_json["request"]["operation"] = "submit"
    submit_request_json["request"]["text"] = msg
    payload_bytes = str.encode(json.dumps(submit_request_json))
    payload_bytes = gzip.compress(payload_bytes)  # if no compression, comment this line
    full_client_request = bytearray(default_header)
    full_client_request.extend((len(payload_bytes)).to_bytes(4, 'big'))  # payload size(4 bytes)
    full_client_request.extend(payload_bytes)  # payload
    return full_client_request


def parse_response(res, stream):
    # print("--------------------------- response ---------------------------")
    # print(f"response raw bytes: {res}")
    protocol_version = res[0] >> 4
    header_size = res[0] & 0x0f
    message_type = res[1] >> 4
    message_type_specific_flags = res[1] & 0x0f
    serialization_method = res[2] >> 4
    message_compression = res[2] & 0x0f
    reserved = res[3]
    header_extensions = res[4:header_size * 4]
    payload = res[header_size * 4:]
    # print(f"            Protocol version: {protocol_version:#x} - version {protocol_version}")
    # print(f"                 Header size: {header_size:#x} - {header_size * 4} bytes ")
    # print(f"                Message type: {message_type:#x} - {MESSAGE_TYPES[message_type]}")
    # print(
    #     f" Message type specific flags: {message_type_specific_flags:#x} - {MESSAGE_TYPE_SPECIFIC_FLAGS[message_type_specific_flags]}")
    # print(
    #     f"Message serialization method: {serialization_method:#x} - {MESSAGE_SERIALIZATION_METHODS[serialization_method]}")
    # print(f"         Message compression: {message_compression:#x} - {MESSAGE_COMPRESSIONS[message_compression]}")
    # print(f"                    Reserved: {reserved:#04x}")
    if header_size != 1:
        print(f"           Header extensions: {header_extensions}")
    if message_type == 0xb:  # audio-only server response
        if message_type_specific_flags == 0:  # no sequence number as ACK
            # print("                Payload size: 0")
            return False
        else:
            sequence_number = int.from_bytes(payload[:4], "big", signed=True)
            payload_size = int.from_bytes(payload[4:8], "big", signed=False)
            payload = payload[8:]
            # print(f"             Sequence number: {sequence_number}")
            # print(f"                Payload size: {payload_size} bytes")
        if stream is not None:
            stream.write(payload)
        if sequence_number < 0:
            return True
        else:
            return False
    elif message_type == 0xf:
        code = int.from_bytes(payload[:4], "big", signed=False)
        msg_size = int.from_bytes(payload[4:8], "big", signed=False)
        error_msg = payload[8:]
        if message_compression == 1:
            error_msg = gzip.decompress(error_msg)
        error_msg = str(error_msg, "utf-8")
        print(f"          Error message code: {code}")
        print(f"          Error message size: {msg_size} bytes")
        print(f"               Error message: {error_msg}")
        return True
    elif message_type == 0xc:
        msg_size = int.from_bytes(payload[:4], "big", signed=False)
        payload = payload[4:]
        if message_compression == 1:
            payload = gzip.decompress(payload)
        print(f"            Frontend message: {payload}")
    else:
        print("undefined message type!")
        return True


class AI(object):
    # ws 连接
    _socket = None

    # 对话队列
    _queue: asyncio.Queue = asyncio.Queue(10)

    # 阻塞队列
    _block: asyncio.Queue = asyncio.Queue(1)

    _audio = None

    _stream = None

    def __init__(self):
        self._audio = pyaudio.PyAudio()
        self._stream = self._audio.open(format=pyaudio.paInt16,
                                        channels=1,
                                        rate=24000,
                                        output=True)

    async def connect_volcengine(self):
        header = {"Authorization": f"Bearer; {token}"}
        while True:
            try:
                msg = await self._queue.get()
                async with websockets.connect(api_url, extra_headers=header, ping_interval=1) as ws:
                    await ws.send(full_client_request(msg[0:200]))
                    while True:
                        res = await ws.recv()
                        done = parse_response(res, self._stream)
                        if done:
                            await self._block.put("done")
                            break
            except Exception as e:
                print(f"语言合成失败: {e}")
                continue

    async def connect_inout(self):
        while True:
            msg = input("My: ")
            url = "http://rwkvv.woa.com/v1/chat/completions"

            header = {"accept": "application/json", "Content-Type": "application/json"}
            data = {
                "messages": [
                    {"role": "user",
                     "content": "你现在是一个中文的问答机器人，接下来将会问题许多问题，请使用中文回答，字数控制在100字以内。"},
                    {"role": "assistant", "content": "好的，我已经准备就绪了。请随时提出任何疑惑或需要解决的问题。"},
                    {
                        "role": "user",
                        "content": msg,
                    }
                ],
                "stream": False,
                "model": "rwkv",
                "temperature": 1,
                "top_p": 0.3,
                "presence_penalty": 0,
                "frequency_penalty": 1
            }

            res = requests.post(url, json=data, headers=header).json()
            ret = res["choices"][0]["message"]["content"]
            await self._queue.put(ret)
            print(f"AI: {ret.strip()}")
            await self._block.get()

    def stop(self):
        self._stream.stop_stream()
        self._stream.close()
        self._audio.terminate()


async def main():
    ai = AI()
    try:
        await asyncio.gather(
            ai.connect_volcengine(),
            ai.connect_inout(),
        )
    except Exception as e:
        print(f"Err: {e}")
    finally:
        ai.stop()


if __name__ == '__main__':
    asyncio.run(main())
