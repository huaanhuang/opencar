import React, {useEffect, useRef} from "react";
import {Button, message, Space} from "antd";

const Index = () => {

    // 使用ref来存储是否已经按下的状态
    const isKeyDown: any = useRef({});

    useEffect(() => {

        // 添加事件监听器
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // 清理函数，在组件卸载时移除事件监听器
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const handleKeyDown = (event: any) => {
        let key = event.key
        if (isKeyDown.current && !isKeyDown.current[key]) {
            // 不允许同时前进和后退
            if (["w", "s", "ArrowDown", "ArrowUp"].indexOf(key) !== -1) {
                isKeyDown.current[key] = true;
                doubleComm({
                    "channel": "before_or_after", // 前进或后退
                    "type": "down",
                    "key": key,
                }).then(() => {
                })
            } else if (["a", "d", "ArrowLeft", "ArrowRight"].indexOf(key) !== -1) {
                isKeyDown.current[key] = true;
                doubleComm({
                    "channel": "left_or_right", // 左或右
                    "type": "down",
                    "key": key,
                }).then(() => {
                })
            } else if (["1", "2", "3", "4", "5"].indexOf(key) !== -1) {
                isKeyDown.current[key] = true;
                doubleComm({
                    "channel": "gear", // 档位
                    "type": "down",
                    "key": key,
                }).then(() => {
                })
            } else {
                console.log(`不支持的键位Down: ${key}`)
            }
        }
    };


    const handleKeyUp = (event: any) => {
        let key = event.key
        if (isKeyDown.current && isKeyDown.current[key]) {
            // 不允许同时前进和后退
            if (["w", "s", "ArrowDown", "ArrowUp"].indexOf(key) !== -1) {
                isKeyDown.current[key] = false;
                doubleComm({
                    "channel": "before_or_after", // 前进或后退
                    "type": "up",
                    "key": key,
                }).then(() => {
                })
            } else if (["a", "d", "ArrowLeft", "ArrowRight"].indexOf(key) !== -1) {
                isKeyDown.current[key] = false;
                doubleComm({
                    "channel": "left_or_right", // 左或右
                    "type": "up",
                    "key": key,
                }).then(() => {
                })
            } else if (["1", "2", "3", "4", "5"].indexOf(key) !== -1) {
                isKeyDown.current[key] = false;
                doubleComm({
                    "channel": "gear", // 档位
                    "type": "up",
                    "key": key,
                }).then(() => {
                })
            } else {
                console.log(`不支持的键位Up: ${key}`)
            }
        }
    };

    const doubleComm = async (data: any) => {
        try {
            data.timestamp = (new Date()).getTime()
            // @ts-ignore
            let api = window.OpenCar
            if (api) {
                await api.keyword(JSON.stringify(data))
            } else {
                message.error("当前环境不支持ipc通信")
            }
        } catch (e: any) {
            message.error(e)
        }
    }

    return (
        <div>
            <div style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}>
                <h1>Electron</h1>
            </div>
            <h2>ipc通信测试</h2>
            <Space>
                <Button type={"primary"} onClick={doubleComm}>发送消息到主进程并等待响应结果</Button>
            </Space>
        </div>
    )
}
export default Index