import React, {useEffect, useRef, useState} from 'react';
import {Button, Space} from "antd";
import SoundMeter from "@/utils/soundMeter";

const Audio = () => {

    const audioPlayer = useRef<any>()

    // 本地流对象
    const localStream = useRef<MediaStream>()

    // 录制对象
    const mediaRecorder = useRef<any>()

    // 录制数据
    const recordedBlobs = useRef<any>()

    // 音频上下文对象
    const audioContext = useRef<any>()

    // 音量测算对象
    const soundMeter = useRef<any>()

    const [status, setStatus] = useState<string>("start")

    const [my_status, setMyStatus] = useState<string>("recording")
    const [volume, setVolume] = useState<number>(0.0)

    const [loading, setLoading] = useState<boolean>(false)
    const [ans, setAns] = useState<string>("")

    //点击打开麦克风按钮
    const startClickHandler = async (e: any) => {
        try {
            //获取音频数据流
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});
            console.log('获取音频stream:', stream);
            //将stream与window.stream绑定
            localStream.current = stream
            //设置当前状态为startRecord
            setStatus("startRecord")
        } catch (e) {
            //发生错误
            console.error('navigator.getUserMedia error:', e);
        }
    }

    //开始录制
    const startRecordButtonClickHandler = () => {
        recordedBlobs.current = [];
        //媒体类型
        let options: any = {mineType: 'audio/ogg;'};
        try {
            //初始化MediaRecorder对象,传入音频流及媒体类型
            mediaRecorder.current = new MediaRecorder(localStream.current as MediaStream, options);
        } catch (e) {
            console.error('MediaRecorder创建失败:', e);
            return;
        }

        //录制停止事件回调
        mediaRecorder.current.onstop = (event: any) => {
            console.log('Recorder stopped: ', event);
            console.log('Recorded Blobs: ', recordedBlobs);
        };
        //当数据有效时触发的事件,可以把数据存储到缓存区里
        mediaRecorder.current.ondataavailable = handleDataAvailable;
        //录制10秒
        mediaRecorder.current.start();
        console.log('MediaRecorder started', mediaRecorder);

        //设置当前状态为stopRecord
        setStatus("stopRecord")
    }

    //录制数据回调事件
    const handleDataAvailable = (event: any) => {
        console.log('handleDataAvailable', event);
        //判断是否有数据
        if (event.data && event.data.size > 0) {
            //将数据记录起来
            recordedBlobs.current.push(event.data);
        }
    }

    //停止录制
    const stopRecordButtonClickHandler = () => {
        mediaRecorder.current.stop();
        mediaRecorder.current = null
        //设置当前状态为play
        setStatus("play")
    }

    //播放录制数据
    const playButtonClickHandler = () => {
        //生成blob文件,类型为audio/ogg
        const blob = new Blob(recordedBlobs.current, {type: 'audio/ogg'});

        audioPlayer.current.src = null;
        //根据blob文件生成播放器的数据源
        audioPlayer.current.src = window.URL.createObjectURL(blob);
        //播放声音
        audioPlayer.current.play();
        //设置当前状态为download
        setStatus("download")
    }

    //下载录制文件
    const downloadButtonClickHandler = (e: any) => {
        //生成blob文件,类型为audio/ogg
        const blob = new Blob(recordedBlobs.current, {type: 'audio/ogg'});
        //URL.createObjectURL()方法会根据传入的参数创建一个指向该参数对象的URL
        const url = window.URL.createObjectURL(blob);
        //创建a标签
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        //设置下载文件
        a.download = 'test.ogg';
        //将a标签添加至网页上去
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            //URL.revokeObjectURL()方法会释放一个通过URL.createObjectURL()创建的对象URL.
            window.URL.revokeObjectURL(url);
        }, 100);
        //设置当前状态为start
        setStatus("start")
    }

    // 上传录音文件
    const uploadButtonClickHandler = (e: any) => {
        //生成blob文件,类型为audio/ogg
        const blob = new Blob(recordedBlobs.current, {type: 'audio/ogg'});
        const formData = new FormData();
        formData.append('file', blob);
        setLoading(true)
        fetch('http://your.gpt.com/text', {
            method: 'POST',
            body: formData
        })
            .then(response => response.text())
            .then(data => {
                setAns(data)
                console.log('Success:', data);
            })
            .catch((error) => {
                setAns(`Error: ${error}`)
                console.error('Error:', error);
            }).finally(() => {
            setMyStatus("recording")
        }).finally(() => {
            setLoading(false)
        })
    }

    const handleRecording = () => {
        try {
            try {
                audioContext.current = new AudioContext()
            } catch (e) {
                console.log('网页音频API不支持.');
                return
            }
            soundMeter.current = new SoundMeter(audioContext.current);

            navigator.mediaDevices.getUserMedia({
                //启用音频
                audio: true,
                //禁用视频
                video: false
            }).then(handleSuccess).catch(handleError)
            setMyStatus("stop")
        } catch (e) {
            console.error(`handleRecording Err: ${e}`)
        }

    }

    const handleSuccess = (stream: MediaStream) => {
        localStream.current = stream
        soundMeter.current.connectToSource(stream)
        // 开始录制
        startRecordButtonClickHandler()
        // 读取音量
        setTimeout(soundMeterProcess, 100)
    }

    // 音频音量处理
    const soundMeterProcess = () => {
        //读取音量值,再乘以一个系数,可以得到音量条的宽度
        let val = (soundMeter.current.instant.toFixed(2) * 348) + 1;
        //设置音量值状态
        setVolume(val)
        //每隔100毫秒调用一次soundMeterProcess函数,模拟实时检测音频音量
        setTimeout(soundMeterProcess, 100);
    }

    const handleError = (error: any) => {
        console.error('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
    }

    const handleStop = () => {
        try {
            soundMeter.current.stop()
            audioContext.current.close()
            if (localStream.current) {
                localStream.current.getTracks().forEach((track: any) => track.stop());
                localStream.current = undefined
            }
            // 停止录制
            stopRecordButtonClickHandler()
        } catch (e) {
            console.error(`handleStop Err: ${e}`)
        } finally {
            setMyStatus("handler")
            setVolume(0.0)
        }
    }

    const handleCancel = () => {
        if (recordedBlobs.current) {
            recordedBlobs.current = null
        }
        setMyStatus("recording")
    }

    return (
        <div style={{padding: "20px 20px"}}>
            <div>
                {/* 音频播放器,播放录制音频 */}
                <audio ref={audioPlayer} controls autoPlay/>

                <Space>
                    <Button
                        className="button"
                        onClick={startClickHandler}
                        disabled={status != 'start'}>
                        打开麦克风
                    </Button>
                    <Button
                        className="button"
                        disabled={status != 'startRecord'}
                        onClick={startRecordButtonClickHandler}>
                        开始录制
                    </Button>
                    <Button
                        className="button"
                        disabled={status != 'stopRecord'}
                        onClick={stopRecordButtonClickHandler}>
                        停止录制
                    </Button>
                    <Button
                        className="button"
                        disabled={status != 'play'}
                        onClick={playButtonClickHandler}>
                        播放
                    </Button>
                    <Button
                        className="button"
                        disabled={status != 'download'}
                        onClick={downloadButtonClickHandler}>
                        下载
                    </Button>
                    <Button
                        className="button"
                        disabled={status != 'download'}
                        onClick={uploadButtonClickHandler}>
                        上传
                    </Button>
                </Space>
            </div>
            <div>
                <h3>显示音量</h3>
                <div>
                    {my_status == "recording" && <Button type={"primary"} onClick={handleRecording}>录制</Button>}
                    {my_status == "stop" && <Button type={"primary"} danger={true} onClick={handleStop}>停止</Button>}
                    {my_status == "handler" && <Space>
                        <Button onClick={playButtonClickHandler} loading={loading}>播放</Button>
                        <Button onClick={uploadButtonClickHandler} loading={loading}>上传</Button>
                        <Button onClick={handleCancel} loading={loading}>取消</Button>
                    </Space>}

                </div>
                <div>
                    音量: {volume}
                </div>
                <div style={{
                    width: `${volume}px`,
                    height: '10px',
                    backgroundColor: '#8dc63f',
                    marginTop: '20px',
                }}>
                </div>
                GPT回答:
                <div>{ans}</div>
            </div>
        </div>
    );
}

export default Audio