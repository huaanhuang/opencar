import {queryCredentials} from "@/services/sign/SignController";
import EventEmitter from 'eventemitter3';
import {send} from "vite";

export const Offer: SignApi.Identity = "offer"

export const Answer: SignApi.Identity = "answer"

//PeerConnection连接
let RTCPeerConnection: any;
// 会话描述
let RTCSessionDescription: any;

export class SignService {

    // 身份
    private readonly identity: SignApi.Identity = ""

    // 信令服务器地址
    private sign_url: string = ""

    // 中转服务器地址
    private turn_url: string = ""

    // 用户ID
    private user_id: string = "0"

    // 用户名
    private username: string = ""

    // 房间ID
    private room_id: string = ""

    // 会话Id
    private session_id: string = "000-111"

    // 所有PeerConnection连接
    private peer_connections: { [key: string]: RTCPeerConnection } = {}

    // 连接配置
    private configuration: RTCConfiguration | null = null

    // ws连接对象
    private socket: WebSocket | null = null

    private local_stream: MediaStream | null = null

    public emitter = new EventEmitter()

    constructor(user_id: string, username: string, room_id: string, identity: SignApi.Identity) {
        this.identity = identity
        this.sign_url = import.meta.env.VITE_SIGN_URL
        this.turn_url = import.meta.env.VITE_TURN_URL
        this.username = username
        this.room_id = room_id
        this.user_id = user_id

        // @ts-ignore RTCPeerConnection兼容性处理
        RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.msRTCPeerConnection;
        // @ts-ignore RTCSessionDescription兼容性处理
        RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription || window.msRTCSessionDescription;
        // @ts-ignore getUserMedia兼容性处理
        navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia;

        // ICE默认配置
        this.configuration = {"iceServers": [{urls: "stun:stun.l.google.com:19302"}]};
    }

    init = async () => {
        try {
            let res = await queryCredentials({service: "turn", username: "sample"})
            this.configuration = {
                iceTransportPolicy: "relay",
                "iceServers": [
                    {
                        "urls": res.data.turn.uris,
                        'username': res.data.turn.username,
                        'credential': res.data.turn.password
                    }
                ]
            }
            console.info(`获取到Turn Server ICE Config:\n ${JSON.stringify(this.configuration)}`)
            // 连接到信令服务器
            let token = window.localStorage.getItem("token")
            this.socket = new WebSocket(`${this.sign_url}?token=${token}`);
            // 连接打开
            this.socket.onopen = this.handleOnOpen
            // 消息处理
            this.socket.onmessage = this.handleOnMessage
            //Socket连接错误
            this.socket.onerror = (e) => {
                console.log('onerror::' + e);
                this.emitter.emit("error", e)
            }
            //Socket连接关闭
            this.socket.onclose = (e) => {
                console.log('onclose::' + e);
            }
        } catch (e: any) {
            if (e.code === 10005) {
                this.emitter.emit("login")
            } else {
                this.emitter.emit("error", e)
            }
        }
    }

    // 连接打开
    private handleOnOpen = () => {
        console.info(`信令服务器连接成功: ${this.sign_url}`);
        this.joinRoom()
    }

    // 消息处理
    private handleOnMessage = (e: MessageEvent) => {
        // 解析JSON消息
        let message = JSON.parse(e.data);
        if (message.type != "heartPackage") {
            console.info('收到的消息: {\n type = ' + message.type + ', \n data = ' + JSON.stringify(message.data) + '\n}');
        }
        //判断条件为消息类型
        switch (message.type) {
            case 'offer':
                this.onOffer(message);
                break;
            case 'answer':
                this.onAnswer(message);
                break;
            case 'candidate':
                this.onCandidate(message);
                break;
            case 'updateUserList':
                this.onUpdateUserList(message);
                break;
            case 'leaveRoom':
                this.onLeave(message);
                break;
            case 'hangUp':
                this.onHangUp(message);
                break;
            case 'heartPackage':
                // console.log('服务端发心跳包!');
                break;
            default:
                console.error('未知消息', message);
        }
    }

    /**
     * 角色: 发起方
     * 开始呼叫远端用户
     * @param remoteUserId 远端用户ID
     * @param media_type 媒体类型
     * @param constraints 约束条件
     */
    startCall = (remoteUserId: string, media_type: string, constraints: MediaStreamConstraints | null = null) => {
        // 本地Id+远端Id组成
        this.session_id = this.user_id + '-' + remoteUserId;
        this.createPeerConnection(remoteUserId, media_type, true);

        // 获取本地媒体流
        // this.getLocalStream(media_type, constraints).then((stream: any) => {
        //     // 取得到本地媒体流
        //     this.local_stream = stream;
        //     // 提议方创建连接PeerConnection
        //     this.createPeerConnection(remoteUserId, media_type, true);
        //     // 派发本地流事件
        //     this.emitter.emit('localstream', stream);
        //     // 派发新的呼叫事件
        //     // this.emit('newCall', this.userId, this.sessionId);
        // });
    }

    /**
     * 角色: 发起方
     * @param remote_user_id 远端用户ID
     * @param media_type 媒体类型 video ｜ screen
     * @param isOffer 是否提议方
     * 在WebRTC中，RTCPeerConnection对象的addTransceiver()方法用于添加一个新的RTCRtpTransceiver到连接中。一个RTCRtpTransceiver代表了一个发送器（RTCRtpSender）和一个接收器（RTCRtpReceiver），它们共同管理一个媒体类型（音频或视频）的发送和接收。
     * addTransceiver()方法可以用于以下几种场景：
     * 发送和/或接收指定类型的媒体：你可以使用addTransceiver()来明确地指定你想要发送和/或接收的媒体类型（音频或视频）。
     * 控制媒体的方向：通过addTransceiver()方法，你可以设置媒体的方向，例如sendonly（只发送）、recvonly（只接收）、sendrecv（发送和接收）或inactive（不发送也不接收）。
     * 协商编解码器：addTransceiver()方法允许你指定编解码器的偏好，这可以在SDP协商过程中使用。
     * 下面是addTransceiver()方法的基本用法：
     * const pc = new RTCPeerConnection();
     * // 添加一个音频传输器，设置为只接收
     * const audioTransceiver = pc.addTransceiver('audio', { direction: 'recvonly' });
     * // 添加一个视频传输器，设置为发送和接收
     * const videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' });
     * 在上面的例子中，我们创建了一个新的RTCPeerConnection对象pc，然后添加了两个传输器：一个音频传输器设置为只接收，一个视频传输器设置为发送和接收。
     * 在Python中使用aiortc库时，addTransceiver()方法的用法类似：
     * from aiortc import RTCPeerConnection, RTCRtpTransceiver
     * pc = RTCPeerConnection()
     * # 添加一个音频传输器，设置为只接收
     * audio_transceiver = pc.addTransceiver(track=None, direction=RTCRtpTransceiver.RECVONLY)
     * # 添加一个视频传输器，设置为发送和接收
     * video_transceiver = pc.addTransceiver(track=None, direction=RTCRtpTransceiver.SENDRECV)
     * 在这个例子中，我们同样创建了一个RTCPeerConnection对象pc，然后添加了两个传输器，一个用于音频，一个用于视频，并设置了相应的方向。
     */
    createPeerConnection = (remote_user_id: string, media_type: string, isOffer: boolean) => {
        console.log("创建PeerConnection...");
        // 创建连接对象
        let pc = new RTCPeerConnection(this.configuration);
        // 视频传输方向
        pc.addTransceiver('video', {direction: 'recvonly'});
        // 音频传输方向
        pc.addTransceiver('audio', {direction: 'recvonly'});
        // 将PC对象放入集合里
        this.peer_connections[remote_user_id] = pc;
        // 收集到Candidate数据
        pc.onicecandidate = (event: any) => {
            console.log('onicecandidate', event);
            if (event.candidate) {
                //消息
                let message = {
                    // Candidate消息类型
                    type: 'candidate',
                    //数据
                    data: {
                        // 对方Id
                        to: remote_user_id,
                        // 自己Id
                        from: this.user_id,
                        //Candidate数据
                        candidate: {
                            'sdpMLineIndex': event.candidate.sdpMLineIndex,
                            'sdpMid': event.candidate.sdpMid,
                            'candidate': event.candidate.candidate,
                        },
                        //会话Id
                        sessionId: this.session_id,
                        //房间Id
                        roomId: this.room_id,
                    }
                }
                //发送消息
                this.send(message);
            }
        };

        pc.onnegotiationneeded = () => {
            console.log('onnegotiationneeded');
        }

        pc.oniceconnectionstatechange = (event: any) => {
            console.log('oniceconnectionstatechange', event);
        };

        pc.onsignalingstatechange = (event: any) => {
            console.log('onsignalingstatechange', event);
        };

        // 远端流到达
        pc.onaddstream = (event: any) => {
            console.log('远端流到达onaddstream', event);
            //通知应用层处理流
            this.emitter.emit("addstream", event.stream)
        };

        // 远端流移除
        pc.onremovestream = (event: any) => {
            console.log('远端流移除 onremovestream', event);
            //通知应用层移除流
            this.emitter.emit("removestream", event.stream)
        };

        // 添加本地流至PC里
        if (this.local_stream) {
            pc.addStream(this.local_stream);
        }

        // 如果是提议方创建Offer
        if (isOffer) {
            this.createOffer(pc, remote_user_id, media_type);
        }

        return pc;
    }

    /**
     * 角色: 发起方
     * @param pc  RTCPeerConnection
     * @param remote_user_id 远端用户ID
     * @param media_type  媒体类型
     */
    createOffer = (pc: RTCPeerConnection, remote_user_id: string, media_type: string) => {
        // 创建提议
        pc.createOffer().then((desc: RTCSessionDescriptionInit) => {
            console.log('createOffer: ', desc.sdp)
            // 设置本地描述
            pc.setLocalDescription(desc).then(() => {
                console.log('setLocalDescription', pc.localDescription);
                //消息
                let message = {
                    //消息类型为offer
                    type: 'offer',
                    //数据
                    data: {
                        //对方Id
                        to: remote_user_id,
                        //本地Id
                        from: this.user_id,
                        //SDP信息
                        description: {'sdp': desc.sdp, 'type': desc.type},
                        //会话Id
                        sessionId: this.session_id,
                        //媒体类型
                        media: media_type,
                        //房间Id
                        roomId: this.room_id,
                    }
                }
                // 发送消息
                this.send(message);
            }).catch(err => {
                console.error(`setLocalDescription Err: ${err}`)
            })
        }).catch((err) => {
            console.error(`createOffer Err: ${err}`)
        })
    }

    /**
     * 角色: 应答方
     * 处理提议方发过来的Offer
     * @param message
     */
    onOffer = (message: any) => {
        // 获取数据
        let data = message.data;
        // 读取发送方Id
        let from = data.from;
        console.log("onOffer data:" + data);
        // 响应这一端默认用视频
        let media_type = 'video';//data.media;
        // 读取会话Id
        this.session_id = data.sessionId;
        //通知应用层新的呼叫
        // this.emitter.emit("newCall", from, this.session_id)

        // 应答方获取本地媒体流
        this.getLocalStream(media_type, {audio: true, video: true}).then((stream: any) => {
            // 获取到本地媒体流
            this.local_stream = stream;
            // 通知应用层本地媒体流
            this.emitter.emit('localstream', stream);
            //应答方创建连接PeerConnection
            let pc: RTCPeerConnection = this.createPeerConnection(from, media_type, false);

            if (pc && data.description) {
                // 应答方法设置远端会话描述SDP
                pc.setRemoteDescription(new RTCSessionDescription(data.description)).then(() => {
                    if (pc.remoteDescription?.type == "offer") {
                        // 生成应答信息
                        pc.createAnswer().then((desc) => {
                            console.info('createAnswer: ', desc);
                            pc.setLocalDescription(desc).then(() => {
                                console.info('setLocalDescription', pc.localDescription);
                                //消息
                                let message = {
                                    //应答消息类型
                                    type: 'answer',
                                    //数据
                                    data: {
                                        // 对方Id
                                        to: from,
                                        // 自己Id
                                        from: this.user_id,
                                        // SDP信息
                                        description: {'sdp': desc.sdp, 'type': desc.type},
                                        // 会话Id
                                        sessionId: this.session_id,
                                        //房间Id
                                        roomId: this.room_id,
                                    }
                                };
                                //发送消息
                                this.send(message);
                            })
                        }).catch(err => {
                            console.error(`setLocalDescription Err: ${err}`)
                        })
                    }
                }).catch(err => {
                    console.error(`setRemoteDescription Err: ${err}`)
                })
            }
        });
    }

    /**
     * 角色: 发起方
     * 处理应答方发过来的Answer
     * @param message
     */
    onAnswer = (message: any) => {
        console.log(">>>>>>>>>>>>>> onAnswer data: ", message, this.user_id)
        // 提取数据
        let data = message.data;
        // 对方Id
        let from = data.from;
        let pc: RTCPeerConnection | null = null;
        // 迭代所有的PC对象
        if (from in this.peer_connections) {
            // 根据Id找到提议方的PC对象
            pc = this.peer_connections[from];
        }
        if (pc && data.description) {
            pc.setRemoteDescription(new RTCSessionDescription(data.description)).then(() => {
                console.info(`setRemoteDescription Success`)
            }).catch(err => {
                console.error(`setRemoteDescription Err: ${err}`)
            })
        }
    }

    /**
     * 更新用户列表
     * @param message
     */
    onUpdateUserList = (message: any) => {
        let data = message.data;
        console.log("users = " + JSON.stringify(data));
        //通知应用层渲染成员列表
        this.emitter.emit("updateUserList", data, this.user_id)
    }

    //接收到对方发过来的Candidate信息
    onCandidate = (message: any) => {
        let data = message.data;
        let from = data.from;
        let pc: RTCPeerConnection | null = null;
        // 根据对方Id找到PC对象
        if (from in this.peer_connections) {
            pc = this.peer_connections[from];
        }
        // 添加Candidate到PC对象中
        if (pc && data.candidate) {
            pc.addIceCandidate(new RTCIceCandidate(data.candidate)).then(() => {
                console.info(">>>>>>>>>>>>onCandidate: ", from, data.candidate)
            })
        }
    }

    onLeave = (message: any) => {
        let id = message.data;
        console.log('leave', id);
        let peerConnections = this.peer_connections;
        let pc = peerConnections[id];
        if (pc !== undefined) {
            pc.close();
            delete peerConnections[id];
            this.emitter.emit("leave", id)
        }
        if (this.local_stream != null) {
            this.closeMediaStream(this.local_stream);
            this.local_stream = null;
        }
        this.emitter.emit("hangUp", id, this.session_id)
    }

    //挂断处理
    onHangUp = (message: any) => {
        let data = message.data;
        //sessionId是由自己和远端Id组成,使用下划线连接
        let ids = data.sessionId.split('_');
        let to = data.to;
        console.log('挂断:sessionId:', data.sessionId);
        //取到两个PC对象
        let peerConnections = this.peer_connections;
        let pc1 = peerConnections[ids[0]];
        let pc2 = peerConnections[ids[1]];
        //关闭pc1
        if (pc1 !== undefined) {
            console.log("关闭视频1");
            pc1.close();
            delete peerConnections[ids[0]];
        }
        //关闭pc2
        if (pc2 !== undefined) {
            console.log("关闭视频2");
            pc2.close();
            delete peerConnections[ids[1]];
        }
        //关闭媒体流
        if (this.local_stream != null) {
            this.closeMediaStream(this.local_stream);
            this.local_stream = null;
        }
        //发送结束会话至上层应用
        this.emitter.emit("hangUp", to, this.session_id)
        //将会话Id设置为初始值000-111
        this.session_id = '000-111';
    }

    //获取本地媒体流
    getLocalStream = (type: any, input_constraints: MediaStreamConstraints | null = null) => {
        return new Promise((pResolve, pReject) => {
            //设置约束条件
            let constraints: MediaStreamConstraints = {
                audio: true,
                video: (type === 'video') ? {width: 1280, height: 720} : false
            };
            if (input_constraints) {
                constraints = input_constraints
            }
            console.log(constraints, "==================")
            //屏幕类型
            if (type === 'screen') {
                //调用getDisplayMedia接口获取桌面流
                navigator.mediaDevices.getDisplayMedia({video: true}).then((mediaStream) => {
                    pResolve(mediaStream);
                }).catch((err) => {
                        console.log(err.name + ": " + err.message);
                        pReject(err);
                    }
                );
            } else {
                // 调用getUserMedia接口获取音视频流
                navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
                    pResolve(mediaStream);
                }).catch((err) => {
                        console.log(err.name + ": " + err.message);
                        pReject(err);
                    }
                );
            }
        });
    }

    //关闭媒体流
    closeMediaStream = (stream: any) => {
        if (!stream)
            return;
        // 获取所有的轨道
        let tracks = stream.getTracks();
        //循环迭代所有轨道并停止
        for (let i = 0, len = tracks.length; i < len; i++) {
            tracks[i].stop();
        }
    }

    /**
     * 发送消息
     * @param message
     */
    public send = (message: any) => {
        this.socket?.send(JSON.stringify(message))
    }

    /**
     * 挂断处理
     */
    hangUp = () => {
        //定义消息
        let message = {
            //消息类型
            type: 'hangUp',
            //数据
            data: {
                //当前会话Id
                sessionId: this.session_id,
                //消息发送者
                from: this.user_id,
                //房间Id
                roomId: this.room_id,
            }
        }
        //发送消息
        this.send(message);
    }

    /**
     * 加入房间
     */
    joinRoom = () => {
        //定义消息
        let message = {
            //加入房间
            'type': 'joinRoom',
            //数据
            'data': {
                // 用户名
                name: this.username,
                // 用户Id
                id: this.user_id,
                // 房间Id
                roomId: this.room_id,
                // 身份
                identity: this.identity
            }
        }
        this.send(message)
    }
}