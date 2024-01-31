import style from './index.module.less'
import Gauge from "@/components/Charts/Gauge";
import Area from "@/components/Charts/Area";
import Navigation from "@/pages/Index/components/Middle/components/Navigation";
import Top10 from "@/pages/Index/components/Middle/components/Top10";
import React, {FC, ReactElement, useEffect, useMemo, useRef, useState} from "react";
import {formatTimestampToMinutesAndSeconds} from "@/utils/helper";
import {Button, Empty, Radio} from 'antd';
import Speed from "@/components/Charts/Speed";

interface IProps {
    data: any;
    handleCall: () => void;
    stream: MediaStream | null;
    answer_online: boolean;
    is_calling: boolean;
    handleHangUp: () => void;
    run_info: any;
}

const Middle: FC<IProps> = ({
                                data,
                                handleCall,
                                stream,
                                answer_online,
                                is_calling,
                                handleHangUp,
                                run_info,
                            }): ReactElement => {

    const remoteVideo = useRef<HTMLVideoElement>(null)

    const [cpu, setCpu] = useState<{ [key: string]: number }>({})

    const [mem, setMem] = useState<{ [key: string]: number }>({})

    const [disk, setDisk] = useState<{ [key: string]: number }>({})

    const [net, setNet] = useState<{ [key: string]: number }>({})

    const [net_title, setNetTitle] = useState<string[]>([])

    const [net_sent, setNetSent] = useState<number[]>([])

    const [net_recv, setNetRecv] = useState<number[]>([])

    const [top_title, setTopTitle] = useState<{ [key: string]: string[] }>({})

    const [top_data, setTopData] = useState<{ [key: string]: number[] }>({})

    const [top_type, setTopType] = useState<string>("cpu")

    // 档位
    const [gear, setGear] = useState<number>(0)


    useEffect(() => {
        if (data.cpu) {
            setCpu(data.cpu || {})
        }
        if (data.memory) {
            setMem(data.memory || {})
        }
        if (data.disk) {
            setDisk(data.disk || {})
        }
        if (data.net_io) {
            setNet(data.net_io || {})

            let current_net_title = net_title
            let current_net_sent = net_sent
            let current_net_recv = net_recv
            if (current_net_title.length >= 7) {
                current_net_title.shift()
            }
            if (current_net_sent.length >= 7) {
                current_net_sent.shift()
            }
            if (current_net_recv.length >= 7) {
                current_net_recv.shift()
            }
            let title = formatTimestampToMinutesAndSeconds(data.net_io.timestamp)
            current_net_title.push(title)
            setNetTitle([...current_net_title])

            current_net_sent.push(data.net_io.moment_bytes_sent ? data.net_io.moment_bytes_sent / 1024 : 0)
            setNetSent([...current_net_sent])

            current_net_recv.push(data.net_io.moment_bytes_recv ? data.net_io.moment_bytes_recv / 1024 : 0)
            setNetRecv([...current_net_recv])
        }

        let title: string[] = []
        let value: number[] = []
        let m_title: string[] = []
        let m_value: number[] = []
        if (data.top_cpu_processes) {
            data.top_cpu_processes.forEach((item: any) => {
                title.push(item.name)
                value.push(item.cpu_percent)
            })
        }
        if (data.top_memory_processes) {
            data.top_memory_processes.forEach((item: any) => {
                m_title.push(item.name)
                m_value.push(item.memory_percent)
            })
        }
        setTopTitle({
            cpu: title,
            mem: m_title,
        })
        setTopData({
            cpu: value,
            mem: m_value,
        })
    }, [data])

    useEffect(() => {
        if (stream) {
            remoteVideo.current!.srcObject = stream
        }
    }, [stream])

    const title_option = useMemo(() => {
        return top_title[top_type] || []
    }, [top_title, top_type])

    const data_option = useMemo(() => {
        return top_data[top_type] || []
    }, [top_data, top_type])

    const onRadioChange = (e: any) => {
        setTopType(e.target.value)
    }

    return (
        <div className={style.middleContainer}>
            <div className={style.left}>
                <div className={style.leftContent}>
                    <div className={style.title}>设备概况</div>
                    <div className={style.indicatorBox}>
                        <div className={style.indicatorItem}>
                            <Gauge color={"#f1785f"} bgColor={"#38272b"}
                                   data={{name: "CPU使用率", value: cpu.usage || 0}}/>
                        </div>
                        <div className={style.indicatorItem}>
                            <Gauge color={"#e9c355"} bgColor={"#353826"}
                                   data={{name: "内存使用率", value: mem.usage || 0}}/>
                        </div>
                    </div>
                    <div className={style.indicatorBox}>
                        <div className={style.indicatorItem}>
                            <Gauge color={"#25d6f8"} bgColor={"#0a3744"}
                                   data={{name: "磁盘使用率", value: disk.usage || 0}}/>
                        </div>
                        <div className={style.indicatorItem}>
                        </div>
                    </div>
                    <div className={style.netIoBox}>
                        <div className={style.title}>流量</div>
                        <div className={style.netView}>
                            <div className={style.netViewItem}>
                                <div>上行</div>
                                <div>{net.moment_bytes_sent ? (net.moment_bytes_sent / 1024).toFixed(0) : 0}KB</div>
                            </div>
                            <div className={style.netViewItem}>
                                <div>下行</div>
                                <div>{net.moment_bytes_recv ? (net.moment_bytes_recv / 1024).toFixed(0) : 0}KB</div>
                            </div>
                            <div className={style.netViewItem}>
                                <div>总发送</div>
                                <div>{net.total_bytes_sent ? (net.total_bytes_sent / 1024 / 1024).toFixed(0) : 0}MB</div>
                            </div>
                            <div className={style.netViewItem}>
                                <div>总接收</div>
                                <div>{net.total_bytes_recv ? (net.total_bytes_recv / 1024 / 1024).toFixed(0) : 0}MB</div>
                            </div>
                        </div>
                        <div className={style.netArea}>
                            <Area title={net_title} sent={net_sent} recv={net_recv}/>
                        </div>

                    </div>
                </div>
            </div>
            <div className={style.center}>
                <div className={style.imageTransmission}>
                    {
                        !answer_online ?
                            <div className={style.notOnline}>
                                <Empty
                                    image={"https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"}
                                    description={<span className={style.text}>Answer不在线</span>}
                                />
                            </div> :
                            is_calling ?
                                <video ref={remoteVideo} muted={false} autoPlay playsInline className={style.video}></video> :
                                <div className={style.notOnline}>
                                    <Empty
                                        image={"https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"}
                                        description={<span className={style.text}>Answer未连接</span>}
                                    />
                                </div>
                    }
                </div>
                <div className={style.control}>
                    <div className={style.rotationalSpeed}>
                        <Speed value={run_info.rotational_speed || 0} max={40} formatter={run_info.gear && run_info.gear > 0 ? `D${run_info.gear}` : "P"}/>
                    </div>
                    <div className={style.operation}>
                        <div className={style.internal}>
                            {
                                is_calling ?
                                    <Button type={"primary"} danger onClick={handleHangUp} block>挂断</Button> :
                                    <Button disabled={!answer_online} type={"primary"}
                                            onClick={handleCall} block>呼叫</Button>
                            }
                            <div className={style.gear}>
                                {run_info.gear || "P"}
                            </div>
                        </div>
                    </div>
                    <div className={style.speed}>
                        <Speed value={run_info.driving_speed || 0} max={320} formatter={"{value}dm/s"}/>
                    </div>

                </div>
            </div>
            <div className={style.right}>
                <div className={style.rightContent}>
                    <div className={style.title}>导航</div>
                    <div className={style.navBox}>
                        <Navigation/>
                    </div>
                    <div className={`${style.title} ${style.titleContent}`}>
                        <div>TOP5</div>
                        <Radio.Group value={top_type} onChange={onRadioChange} buttonStyle="solid">
                            <Radio.Button value="cpu">CPU</Radio.Button>
                            <Radio.Button value="mem">MEM</Radio.Button>
                        </Radio.Group>
                    </div>
                    <div className={style.top10Box}>
                        <Top10 title={title_option} data={data_option}/>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Middle