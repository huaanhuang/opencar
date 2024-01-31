import style from './index.module.less'
import React, {FC, ReactElement, useCallback, useEffect, useRef, useState} from "react";
import {SignService, Answer, Offer} from "@/services/sign/SignService";
import {Button, Empty, message, Space} from "antd";
// @ts-ignore
import {v4 as uuidv4} from 'uuid';
import Access from "@/pages/Index/components/Access";
import OfferService from "@/services/sign/OfferService";
import {
    AnswerCmd,
    AnswerIdentity,
    ControllerCmd,
    OfferIdentity,
    OnAddStream,
    OnAnswerLevel,
    OnJoin, OnMonitor, OnRunInfo
} from "@/services/sign/consts";
import Message = SignApi.Message;
// @ts-ignore
import {throttle} from 'lodash';
import Top from "@/pages/Index/components/Top";
import Middle from "@/pages/Index/components/Middle";
import Bottom from "@/pages/Index/components/bottom";


interface IProps {

}

const Index: FC<IProps> = ({}): ReactElement => {

    // offer信令服务
    const offerService = useRef<OfferService>()

    // 远端流
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

    const [answer_online, setAnswerOnline] = useState<boolean>(false)

    // 是否正在进行通话
    const [is_calling, setIsCalling] = useState<boolean>(false)

    // 是否登录
    const [is_login, setIsLogin] = useState<boolean>(false)

    // 使用ref来存储是否已经按下的状态
    const isKeyDown: any = useRef({});

    // 转向定时器
    const steeringInterval: any = useRef(null)

    // 记录鼠标坐标
    const lastX = useRef<number | null>(null)
    const lastY = useRef<number | null>(null)

    // DPI定义: 移动多少个像素对用舵机旋转1度
    const [dpi, setDPI] = useState<number>(5)

    const [monitor, setMonitor] = useState<any>({})

    const [run_info, setRunInfo] = useState<any>({})

    // 初始化图传
    useEffect(() => {
        let service = new OfferService()
        service.emitter.on(OnJoin, (identities: string[]) => {
            if (identities.indexOf(AnswerIdentity) !== -1) {
                setAnswerOnline(true)
            } else {
                setAnswerOnline(false)
            }
        })
        service.emitter.on(OnAddStream, (streams: MediaStream[]) => {
            setRemoteStream(streams[0])
        })
        service.emitter.on(OnAnswerLevel, () => {
            setIsCalling(false)
            setAnswerOnline(false)
        })
        service.emitter.on(OnMonitor, (data) => {
            console.log(data)
            setMonitor(data)
        })
        service.emitter.on(OnRunInfo, (data) => {
            setRunInfo(data)
        })
        service.init().then(res => {
            setIsLogin(true)
        }).catch(e => {
            console.log(e.msg)
            message.error(e.msg)
        })
        offerService.current = service
    }, [])

    // 初始化控制
    useEffect(() => {
        // 添加事件监听器
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        // window.addEventListener('mousemove', handleMouseMove)

        // 清理函数，在组件卸载时移除事件监听器
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            // window.removeEventListener("mousemove", handleMouseMove)
            // handleMouseMove.cancel(); // 取消节流函数的任何未执行的调用
        };
    }, [])

    const is_handle_controller = (key: string): boolean => {
        return ["w", "s", "ArrowDown", "ArrowUp", "a", "d", "ArrowLeft", "ArrowRight", "1", "2", "3", "4", "5", " "].indexOf(key) != -1;
    }

    const handleKeyDown = (event: any) => {
        let key = event.key
        // Shift按下
        if (key == "Shift") {
            window.addEventListener('mousemove', handleMouseMove)
            return
        }
        // 控制健按下
        if (is_handle_controller(key)) {
            if (isKeyDown.current && !isKeyDown.current[key]) {
                if (["w", "s", "ArrowDown", "ArrowUp"].indexOf(key) !== -1) {
                    isKeyDown.current[key] = true;
                    send_controller({
                        "channel": "bf",
                        "type": "down",
                        "key": key
                    })
                } else if (["a", "d", "ArrowLeft", "ArrowRight"].indexOf(key) !== -1) {
                    isKeyDown.current[key] = true;
                    if (steeringInterval.current == null) {
                        send_controller({
                            "channel": "lr",
                            "type": "down",
                            "key": key
                        })
                        steeringInterval.current = setInterval(() => {
                            send_controller({
                                "channel": "lr",
                                "type": "down",
                                "key": key
                            })
                        }, 100)
                    }
                } else if (["1", "2", "3", "4", "5"].indexOf(key) !== -1) {
                    isKeyDown.current[key] = true;
                    send_controller({
                        "channel": "gear",
                        "type": "down",
                        "key": key
                    })
                } else if (key == " ") {
                    isKeyDown.current[key] = true;
                    send_controller({
                        "channel": "beep",
                        "type": "down",
                        "key": key
                    })
                } else {
                    console.log(`不支持的键位Down: ${key}`)
                }
            }
        }
    };


    const handleKeyUp = (event: any) => {
        let key = event.key
        // Shift抬起
        if (key == "Shift") {
            window.removeEventListener("mousemove", handleMouseMove)
            handleMouseMove.cancel(); // 取消节流函数的任何未执行的调用
            lastX.current = null
            lastY.current = null
            return
        }
        // 控制键抬起
        if (is_handle_controller(key)) {
            if (isKeyDown.current && isKeyDown.current[key]) {
                // 不允许同时前进和后退
                if (["w", "s", "ArrowDown", "ArrowUp"].indexOf(key) !== -1) {
                    isKeyDown.current[key] = false;
                    send_controller({
                        "channel": "bf",
                        "type": "up",
                        "key": key
                    })
                } else if (["a", "d", "ArrowLeft", "ArrowRight"].indexOf(key) !== -1) {
                    isKeyDown.current[key] = false;
                    if (steeringInterval.current != null) {
                        clearInterval(steeringInterval.current)
                        steeringInterval.current = null
                    }
                    send_controller({
                        "channel": "lr",
                        "type": "up",
                        "key": key
                    })
                } else if (["1", "2", "3", "4", "5"].indexOf(key) !== -1) {
                    isKeyDown.current[key] = false;
                    send_controller({
                        "channel": "gear",
                        "type": "up",
                        "key": key
                    })
                } else if (key == " ") {
                    isKeyDown.current[key] = false;
                    send_controller({
                        "channel": "beep",
                        "type": "up",
                        "key": key
                    })
                } else {
                    console.log(`不支持的键位Up: ${key}`)
                }
            }
        }
    };

    // 节流后的处理函数 DPI定义: 移动多少个像素对用舵机旋转1度
    const handleMouseMove = throttle((event: MouseEvent): void => {
        // 如果是第一次移动，初始化lastX和lastY
        if (lastX.current === null || lastY.current === null) {
            lastX.current = event.clientX;
            lastY.current = event.clientY;
            return;
        }

        // 计算移动距离
        const deltaX = event.clientX - lastX.current;
        const deltaY = event.clientY - lastY.current;

        // 输出移动方向和距离
        if (Math.abs(deltaX) >= dpi || Math.abs(deltaY) >= dpi) {
            // 更新上一次的位置
            lastX.current = event.clientX;
            lastY.current = event.clientY;
            // todo 发布指令
            send_controller({
                channel: "ptz",
                type: "ptz",
                key: JSON.stringify({
                    x: Math.floor(deltaX / dpi),
                    y: Math.floor(deltaY / dpi)
                }),
            })
            console.log(`Moved: deltaX: ${deltaX}, deltaY: ${deltaY}, X旋转: ${Math.floor(deltaX / dpi)}度, Y旋转: ${Math.floor(deltaY / dpi)}度`);
        }
    }, 300); // 100毫秒内最多执行一次

    const send_controller = (data: any) => {
        let msg: Message = {
            cmd: ControllerCmd,
            from: OfferIdentity,
            to: AnswerCmd,
            data: data
        }
        offerService.current?.send(msg)
    }


    const getToke = (token: string) => {
        window.localStorage.setItem("token", token)
        offerService.current?.init().then(r => {
            message.success("访问密钥设置成功")
            setIsLogin(true)
        }).catch((e: any) => {
            message.error(e.msg).then()
        })
    }


    // 处理挂断
    const handleHangUp = useCallback(() => {
        offerService.current?.handleHangUp()
        setIsCalling(false)
    }, [offerService.current])

    const handleCall = useCallback(() => {
        offerService.current?.startCall()
        setIsCalling(true)
    }, [offerService.current])

    return (

        // <div className={style.container}>
        //     {!is_login ? <Access getToke={getToke}/> :
        //         <div className={style.content}>
        //             <div className={style.left}>
        //                 左边功能区
        //             </div>
        //             <div className={style.center}>
        //                 {
        //                     !answer_online ?
        //                         <div className={style.notOnline}><Empty
        //                             description={<span className={style.text}>Answer不在线</span>}/></div> :
        //                         // <video ref={remoteVideo} autoPlay playsInline className={style.video}></video>
        //                         is_calling ?
        //                             <video ref={remoteVideo} autoPlay playsInline className={style.video}></video> :
        //                             <div className={style.notOnline}><Empty
        //                                 description={<span className={style.text}>Answer未连接</span>}/></div>
        //                 }
        //
        //                 <div className={style.ribbon}>
        //                     {
        //                         is_calling ?
        //                             <Button type={"primary"} danger onClick={handleHangUp} block>挂断</Button> :
        //                             <Button disabled={!answer_online} type={"primary"}
        //                                     onClick={handleCall} block>呼叫</Button>
        //                     }
        //                 </div>
        //             </div>
        //             <div className={style.right}>
        //                 右边功能区
        //             </div>
        //         </div>
        //     }
        // </div>

        <div className={style.container}>
            {!is_login ? <Access getToke={getToke}/> :
                <>
                    <Top/>
                    <Middle
                        data={monitor}
                        handleCall={handleCall}
                        stream={remoteStream}
                        answer_online={answer_online}
                        is_calling={is_calling}
                        handleHangUp={handleHangUp}
                        run_info={run_info}
                    />
                    <Bottom/>
                </>
            }
        </div>
    )
}

export default Index