"""
@Time: 2024/1/19 21:46
@Auth: huangdingbo
@File: audio.py
@IDE: PyCharm
@DESC: 描述
"""

# import asyncio
# from aiortc.contrib.media import MediaPlayer
#
#
# async def consume_audio(media_player):
#     while True:
#         frame = await media_player.audio.recv()
#         # 处理音频帧
#         print("Got an audio frame with", len(frame.planes[0]), "bytes")
#
#
# # 创建 MediaPlayer 对象，指定 ALSA 设备的卡号和设备号
# # 根据 `arecord -l` 的输出，使用 'hw:3,0'
# media_player = MediaPlayer('hw:3,0', options={'channels': '2', 'rate': '48000'})
#
# # 在事件循环中运行消费音频的协程
# loop = asyncio.get_event_loop()
# try:
#     loop.run_until_complete(consume_audio(media_player))
# finally:
#     loop.close()
import sounddevice as sd
import numpy as np


# 定义回调函数来处理捕获的音频帧
def audio_callback(indata, frames, time, status):
    if status:
        print(status)
    # 处理音频帧
    print("Got an audio frame with", len(indata), "samples")


# 打开音频流
stream = sd.InputStream(device='hw:3,0', channels=1, callback=audio_callback, samplerate=48000)

# 开始捕获
with stream:
    print("Recording started...")
    # 这里可以设置一个条件来停止录音，例如等待用户输入或设置一个时间限制
    input("Press Enter to stop recording...")

print("Recording stopped.")
