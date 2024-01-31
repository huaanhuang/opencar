"""
@Time: 2024/1/17 17:39
@Auth: huangdingbo
@File: client.py
@IDE: PyCharm
@DESC: 描述
"""
import asyncio
import gc
import json
import logging
import platform

import websockets
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, \
    RTCIceServer, RTCIceCandidate
from aiortc.contrib.media import MediaPlayer, MediaRelay

logging.basicConfig(level=logging.INFO)

# 信令服务器的 WebSocket URL
WS_URL = "ws://127.0.0.1:8082/car?token=d10c874d52728540ca70ee36723a5995&identity=ANSWER"

# 创建 RTCPeerConnection
pc: RTCPeerConnection = None

local_audio_track = None

local_video_track = None

# 创建媒体中继以避免多个消费者消耗媒体流
relay = None

webcam = None


def create_local_tracks():
    global relay, webcam
    options = {"framerate": "30", "video_size": "640x480"}
    if relay is None:
        if platform.system() == "Darwin":
            webcam = MediaPlayer(
                "default:default", format="avfoundation", options=options
            )
        elif platform.system() == "Windows":
            webcam = MediaPlayer(
                "video=Integrated Camera", format="dshow", options=options
            )
        else:
            webcam = MediaPlayer("/dev/video0", format="v4l2", options=options)
        relay = MediaRelay()
    return relay.subscribe(webcam.audio), relay.subscribe(webcam.video)


def stop_local_tracks():
    global relay, webcam
    if webcam is not None:
        # 删除对 MediaPlayer 对象的引用
        webcam = None
    if relay is not None:
        # 如果需要，也可以删除对 MediaRelay 对象的引用
        relay = None
    # 手动触发垃圾回收以释放资源
    gc.collect()


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


# 创建 WebSocket 连接
async def connect_websocket():
    async with websockets.connect(WS_URL) as ws:
        await websocket_handler(ws)


# 处理 WebSocket 消息
async def websocket_handler(ws):
    while True:
        msg = await ws.recv()
        message = json.loads(msg)
        cmd = message.get("cmd")
        if cmd is not None:
            print(f"收到消息: {message}")
            if cmd == "OFFER":
                await handleRemoteOffer(ws, message)
            elif cmd == "CANDIDATE":
                await handleRemoteCandidate(ws, message)
            elif cmd == "LEAVE":
                await handleLeaveCmd(ws, message)
            else:
                print(f"未知命令: {message}")


async def handleRemoteOffer(ws, msg):
    global pc, local_audio_track, local_video_track
    if pc is None:
        pc = RTCPeerConnection(RTCConfiguration(iceServers=[
            RTCIceServer(
                urls="turn:81.71.98.210:3478?transport=udp",
                username="huaan",
                credential="hdb123456",
            ),
            # RTCIceServer(
            #     urls="stun:81.71.98.210:3478",
            # )
        ]))
        audio, video = create_local_tracks()
        if audio:
            local_audio_track = pc.addTrack(audio)
        if video:
            local_video_track = pc.addTrack(video)
        desc = msg.get("data", {})
        await pc.setRemoteDescription(RTCSessionDescription(
            sdp=desc.get("sdp", ""),
            type=desc.get("type", ""),
        ))

        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        # aiortc 不使用 icecandidate 事件，而是将候选信息直接包含在SDP中
        send_msg = json.dumps({
            "cmd": "ANSWER",
            "from": "ANSWER",
            "to": "OFFER",
            "data": {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
        })
        print(f"发送消息: {send_msg}")
        await ws.send(send_msg)


async def handleRemoteCandidate(ws, message):
    await pc.addIceCandidate(js_candidate_to_python_candidate(message["data"]))


async def handleLeaveCmd(ws, message):
    global pc, local_audio_track, local_video_track
    if local_audio_track:
        await local_audio_track.stop()
        local_audio_track = None
    if local_video_track:
        await local_video_track.stop()
        local_video_track = None
    if pc:
        await pc.close()
        pc = None
    # 取消设备占用
    stop_local_tracks()


# 主函数
async def main():
    # 连接到 WebSocket 服务器
    await connect_websocket()


# 运行主函数
if __name__ == '__main__':
    asyncio.get_event_loop().run_until_complete(main())
