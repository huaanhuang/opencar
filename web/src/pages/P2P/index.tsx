import style from './index.module.less'
import React, {FC, ReactElement, useEffect, useRef, useState} from "react";
import {SignService, Answer, Offer} from "@/services/sign/SignService";
import {useLocation} from "react-router-dom";
import {Button, message, Space} from "antd";
// @ts-ignore
import {v4 as uuidv4} from 'uuid';


interface IProps {

}

const Index: FC<IProps> = ({}): ReactElement => {

    // const location = useLocation();
    //
    // // 信令服务对象
    // const signService = useRef<SignService>()
    //
    // // 远端流
    // const remoteStream = useRef<MediaStream>()
    //
    // // 远端video标签实例
    // const remoteVideo = useRef<HTMLVideoElement>(null)
    //
    // // 本地流
    // const localStream = useRef<MediaStream>()
    //
    // // 本地video标签实例
    // const localVideo = useRef<HTMLVideoElement>(null)
    //
    // // 本地身份
    // const [localIdentity, setLocalIdentity] = useState<SignApi.Identity>(Offer)
    //
    // // 远端流身份
    // const [remoteIdentity, setRemoteIdentity] = useState<SignApi.Identity>(Answer)
    //
    // // 用户ID
    // const [user_id, setUserId] = useState<string>("")
    //
    // // 远端用户ID
    // const [remote_user_id, setRemoteUserId] = useState<string>("")
    //
    // // 是否打开音频
    // const [is_open_audio, setIsOpenAudio] = useState<boolean>(true)
    //
    // // 是否打开视频
    // const [is_open_video, setIsOpenVideo] = useState<boolean>(true)
    //
    // // 是否正在进行通话
    // const [is_calling, setIsCalling] = useState<boolean>(false)
    //
    // useEffect(() => {
    //     const searchParams = new URLSearchParams(location.search);
    //     let identity = searchParams.get("identity") as SignApi.Identity
    //     let username = searchParams.get("username")
    //     let room_id = searchParams.get("room_id")
    //     if ([Offer, Answer].indexOf(identity) === -1) {
    //         message.error("身份不正确")
    //         return
    //     }
    //     if (!username || !room_id) {
    //         message.error("参数不正确")
    //         return
    //     }
    //     let user_id = uuidv4().split("-")[0]
    //     setLocalIdentity(identity)
    //     setUserId(user_id)
    //     let sign = new SignService(user_id, username, room_id, identity)
    //     sign.emitter.on("updateUserList", (data, user_id) => {
    //         // 服务端主动发起呼叫
    //         if (identity == Offer && data.length >= 2) {
    //             data.forEach((item: any) => {
    //                 if (item.identity == Answer && item.id != user_id) {
    //                     sign.startCall(item.id, "video")
    //                     setRemoteUserId(item.id)
    //                     setRemoteIdentity(item.identity)
    //                     setIsCalling(true)
    //                 }
    //             })
    //         }
    //     })
    //     // 添加远端流
    //     sign.emitter.on("addstream", (stream: any) => {
    //         // 将媒体流设置到 video 标签上播放
    //         remoteVideo.current!.srcObject = stream
    //         // 存储本地流
    //         remoteStream.current = stream
    //     })
    //     // 添加本地流
    //     sign.emitter.on("localstream", (stream: any) => {
    //         localVideo.current!.srcObject = stream
    //         localStream.current = stream
    //     })
    //     // 添加远端用户ID
    //     sign.emitter.on("remote_user_id", (user_id: string) => {
    //         setRemoteUserId(user_id)
    //         setIsCalling(true)
    //     })
    //     // 挂端
    //     sign.emitter.on("hangUp", (to, session_id) => {
    //         setIsCalling(false)
    //         setRemoteIdentity("")
    //         setRemoteUserId("")
    //         localStream.current = undefined
    //         remoteStream.current = undefined
    //     })
    //     // 保存信令对象
    //     signService.current = sign
    // }, [])
    //
    //
    // // 音频开关
    // const handleAudioSwitch = () => {
    //     let current_is_open_audio = !is_open_audio
    //     // 获取所有的音频轨道
    //     let audioTracks = localStream.current?.getAudioTracks()
    //     if (audioTracks?.length === 0) {
    //         message.warning("没有音频轨道")
    //         return
    //     }
    //     audioTracks?.forEach(item => {
    //         item.enabled = current_is_open_audio
    //     })
    //     // 设置状态
    //     setIsOpenAudio(current_is_open_audio)
    // }
    //
    // const handleVideoSwitch = () => {
    //     let current_is_open_video = !is_open_video
    //     // 获取所有的视频轨道
    //     let videoTracks = localStream.current?.getVideoTracks()
    //     if (videoTracks?.length === 0) {
    //         message.warning("没有视频轨道")
    //         return
    //     }
    //     videoTracks?.forEach(item => {
    //         item.enabled = current_is_open_video
    //     })
    //     // 设置状态
    //     setIsOpenVideo(current_is_open_video)
    // }
    //
    // // 处理挂断
    // const handleHangUp = () => {
    //     signService.current?.hangUp()
    // }
    //
    // const handleJoin = () => {
    //     signService.current?.joinRoom()
    // }
    //
    // return (
    //     <div className={style.container}>
    //         <div className={style.local}>
    //             {/*角色-user_id*/}
    //             <h2>本地流: {localIdentity}@{user_id}</h2>
    //             <video ref={localVideo} autoPlay playsInline className={style.video}></video>
    //             <Space>
    //                 <Button onClick={handleAudioSwitch}>{is_open_audio ? "关闭音频" : "打开音频"}</Button>
    //                 <Button onClick={handleVideoSwitch}>{is_open_video ? "关闭视频" : "打开视频"}</Button>
    //                 {is_calling && localIdentity==Offer && <Button danger onClick={handleHangUp}>{"挂断"}</Button>}
    //                 {!is_calling && localIdentity==Offer && <Button type={"primary"} onClick={handleJoin}>{"加入房间"}</Button>}
    //             </Space>
    //         </div>
    //         <div className={style.remote}>
    //             <h2>远端流: {remoteIdentity}@{remote_user_id}</h2>
    //             <video ref={remoteVideo} autoPlay playsInline className={style.video}></video>
    //         </div>
    //     </div>
    // )
    return (<div></div>)
}

export default Index