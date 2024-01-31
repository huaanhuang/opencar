import EventEmitter from "eventemitter3";
import {queryCredentials} from "@/services/sign/SignController";
import {
    AnswerCmd,
    AnswerIdentity,
    CandidateCmd,
    JoinCmd, LeaveCmd,
    OfferCmd,
    OfferIdentity, OnAddStream,
    OnError,
    OnJoin
} from "@/services/sign/consts";
import Message = SignApi.Message;

//PeerConnection连接
let RTCPeerConnection: any;
// 会话描述
let RTCSessionDescription: any;

export default class AnswerService {

    // 身份
    private readonly identity: SignApi.Identity = AnswerIdentity

    private readonly constraints = {
        audio: true,
        video: {width: 320, height: 240},
    }

    // 所有PeerConnection连接
    private pc: RTCPeerConnection | null = null

    // 连接配置
    private configuration: RTCConfiguration | null = null

    // ws连接对象
    private socket: WebSocket | null = null

    public emitter = new EventEmitter()

    private localStream: any = null

    constructor() {
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
        let sign_url = import.meta.env.VITE_SIGN_URL
        let res = await queryCredentials({service: "turn", username: "sample"})
        this.configuration = {
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
            iceTransportPolicy: "relay",
            "iceServers": [
                {
                    "urls": res.data.turn.uris,
                    "username": res.data.turn.username,
                    "credential": res.data.turn.password,
                },
                {
                    "urls": res.data.stun.uris
                }
            ]
        }
        console.info(`获取到Turn Server ICE Config:\n ${JSON.stringify(this.configuration)}`)
        // 连接到信令服务器
        let token = window.localStorage.getItem("token")
        let identity = this.identity
        this.socket = new WebSocket(`${sign_url}?token=${token}&identity=${identity}`);
        // 连接打开
        this.socket.onopen = this.onOpen
        // 消息处理
        this.socket.onmessage = this.onMessage
        //Socket连接错误
        this.socket.onerror = (e) => {
            console.error(`socket::onerror: ${e}`);
            this.emitter.emit("error", e)
        }
        //Socket连接关闭
        this.socket.onclose = (e) => {
            console.log(`socket::onclose: ${e}`);
        }
    }

    onOpen = () => {
        console.info(`信令服务器连接成功`);
    }

    onMessage = (e: MessageEvent) => {
        // 解析JSON消息
        let message: Message = JSON.parse(e.data);
        if (message.cmd) {
            console.info(`收到消息: ${e.data}`)
            switch (message.cmd) {
                case JoinCmd:
                    this.handleJoinCmd(message)
                    break
                case OfferCmd:
                    this.handleRemoteOffer(message)
                    break
                case CandidateCmd:
                    this.handleRemoteCandidate(message)
                    break
                case LeaveCmd:
                    this.handleRemoteLeave(message)
                    break
                default:
                    this.handleError(`未知命令: ${message.cmd}`)
            }
        }

    }

    handleJoinCmd = (msg: Message) => {
        this.emitter.emit(OnJoin, msg.data)
    }

    handleError = (info: string) => {
        this.emitter.emit(OnError, info)
    }

    handleRemoteOffer = (msg: Message) => {
        if (this.pc == null) {
            // 音视频通话的核心类
            this.pc = new RTCPeerConnection(this.configuration);
            this.pc!.onicecandidate = this.handleIceCandidate;
            // this.pc!.ontrack = this.handleRemoteStreamAdd;
            this.pc!.onconnectionstatechange = this.handleConnectionStateChange;
            this.pc!.oniceconnectionstatechange = this.handleIceConnectionStateChange

            this.pc?.setRemoteDescription(msg.data).then(() => {
                navigator.mediaDevices.getUserMedia(this.constraints).then(stream => {
                    this.localStream = stream
                    // 把本地流设置给RTCPeerConnection
                    this.localStream.getTracks().forEach((track: any) => {
                        console.log(`添加track: ${track}`)
                        this.pc!.addTrack(track, this.localStream)
                    });
                    this.pc?.createAnswer().then(this.createAnswerAndSendMessage).catch(this.handleCreateAnswerError)
                })
            }).catch(e => {
                console.error(`handleRemoteOffer::setRemoteDescription Err: ${e}`)
            })
        }
    }

    private handleIceCandidate = (event: any) => {
        console.info("handleIceCandidate");
        if (event.candidate) {
            let msg: Message = {
                cmd: CandidateCmd,
                from: OfferIdentity,
                to: AnswerIdentity,
                data: event.candidate
            }
            this.send(msg)
            console.info(`send candidate message: ${JSON.stringify(msg)}`);
        } else {
            console.warn("End of candidates");
        }
    }

    private handleRemoteStreamAdd = (event: any) => {
        console.info("handleRemoteStreamAdd");
        this.emitter.emit(OnAddStream, event.streams)
    }

    private handleConnectionStateChange = () => {
        if (this.pc) {
            console.info("ConnectionStateChange: ", this.pc.connectionState)
        }
    }

    private handleIceConnectionStateChange = () => {
        if (this.pc != null) {
            console.info("IceConnectionStateChange -> " + this.pc.iceConnectionState);
        }
    }

    private createAnswerAndSendMessage = (description: any) => {
        this.pc!.setLocalDescription(description)
            .then(() => {
                let msg: Message = {
                    cmd: AnswerCmd,
                    from: AnswerIdentity,
                    to: OfferIdentity,
                    data: description
                }
                this.send(msg)
                console.info(`send answer message: ${JSON.stringify(msg)}`)
            }).catch((e) => {
            console.error(`answer setLocalDescription failed: ${e}`);
        })
    }

    private handleCreateAnswerError = (error: any) => {
        console.error(`handleCreateAnswerError: ${error}`);
    }

    private handleRemoteCandidate = (msg: Message) => {
        console.info("handleRemoteCandidate");
        console.info(">>>>>>>>>>", msg.data)
        let candidate = new RTCIceCandidate(msg.data)
        this.pc!.addIceCandidate(candidate).catch(e => {
            console.error(`addIceCandidate failed: ${e}`);
        });
    }

    private handleRemoteLeave = (msg: Message) => {
        if (msg.from == OfferIdentity) {
            this.localStream.getTracks().forEach((track: any) => {
                track.stop();
            });
            this.localStream = null
            this.pc = null
        }
    }
    public send = (message: any) => {
        this.socket?.send(JSON.stringify(message))
    }

}