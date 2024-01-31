import React, {FC, ReactElement, useRef} from "react";
import style from './index.module.less'
import {Button, message, Space} from "antd";

interface IProps {

}

const Camera: FC<IProps> = ({}): ReactElement => {
    // video标签实例，播放本人的视频
    const localVideo = useRef<HTMLVideoElement>(null)

    // 本地流
    const localStream = useRef<MediaStream>()

    const openCamera = () => {
        // 获取音视频流
        navigator.mediaDevices.getUserMedia({
            audio: true,
            video: {
                width: { ideal: 500 },
                height: { ideal: 700 }
            }
        }).then((stream: MediaStream) => {
            // 将媒体流设置到 video 标签上播放
            localVideo.current!.srcObject = stream
            // 存储本地流
            localStream.current = stream
        }).catch((e: MediaError) => {
            message.error(`获取音视频流失败: ${e}`)
        })
    }

    const hangUp = () => {
        localVideo.current!.srcObject = null
        localStream.current?.getTracks()[0].stop()
    }

    return (
        <div className={style.cameraContainer}>
            <div>
                <div className={style.video}>
                    <video ref={localVideo} autoPlay playsInline></video>
                </div>
                <Space>
                    <Button onClick={openCamera}>发起视频</Button>
                    <Button onClick={hangUp}>挂断</Button>
                </Space>
            </div>
        </div>
    )
}

export default Camera