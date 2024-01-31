import React, {Suspense} from 'react'
import ReactDOM from 'react-dom/client'
// 全局样式文件
import './styles/index.less';
import {QiankunProps, qiankunWindow, renderWithQiankun,} from 'vite-plugin-qiankun/dist/helper'
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {routes} from "@/routes";
import NotFound from "@/pages/404";
import {ConfigProvider} from "antd";
import zhCN from 'antd/es/locale/zh_CN';
import store from '@/modules/store';
import {Provider} from "react-redux";
// 日期中文
import 'dayjs/locale/zh-cn';
import dayjs from "dayjs";

dayjs.locale('zh-cn');

let root: any
const render = (props: QiankunProps = {}) => {
    const {container} = props;
    root = ReactDOM.createRoot(container ? container.querySelector("#root") as HTMLElement : document.getElementById('root') as HTMLElement)
    root.render(

        <Suspense>
            {/*在严格模式下，React 的开发环境会刻意执行两次渲染，用于突出显示潜在问题*/}
            {/*<React.StrictMode>*/}
                {/*redux支持*/}
                <Provider store={store}>
                    {/*设置微应用基础路径*/}
                    <BrowserRouter
                        basename={qiankunWindow.__POWERED_BY_QIANKUN__ ? import.meta.env.VITE_QIANKUN_BASE_NAME : "/"}
                    >
                        <div className={"content"}>
                            {/*antd主题配置*/}
                            <ConfigProvider locale={zhCN} theme={{
                                token: {
                                    colorLink: 'rgb(38, 92, 240)',
                                    colorPrimary: 'rgb(38, 92, 240)',
                                }
                            }}>
                                {/*注册路由*/}
                                <Routes>
                                    {routes.map((route: any) => (
                                        <Route
                                            key={route.path}
                                            path={route.path}
                                            element={
                                                <route.component {...props}/>
                                            }
                                        />
                                    ))}
                                    <Route path="*" element={<NotFound/>}/>
                                </Routes>
                            </ConfigProvider>
                        </div>
                    </BrowserRouter>
                </Provider>
            {/*</React.StrictMode>*/}
        </Suspense>
    )
}

const initQianKun = () => {
    renderWithQiankun({
        // bootstrap 只会在微应用初始化的时候调用一次，下次微应用重新进入时会直接调用 mount 钩子，不会再重复触发 bootstrap。
        // 通常我们可以在这里做一些全局变量的初始化，比如不会在 unmount 阶段被销毁的应用级别的缓存等。
        bootstrap() {
            console.log('微应用：bootstrap')
        },
        // 应用每次进入都会调用 mount 方法，通常我们在这里触发应用的渲染方法
        mount(props) { // 获取主应用传入数据
            console.log('微应用：mount', props)
            render(props)
        },
        //应用每次 切出/卸载 会调用的unmount方法，通常在这里我们会卸载微应用的应用实例
        unmount(props) {
            console.log('微应用：unmount', props)
            // react17
            // ReactDOM.unmountComponentAtNode(
            //     props.container ? props.container.querySelector('#root') : document.getElementById('root'),
            // );
            // react18!!!
            root.unmount(
                props.container ? props.container.querySelector('#root') : document.getElementById('root')
            )
        },
        // 可选生命周期 ，使用loadMicroApp方式加载应用时有效
        update(props) {
            console.log('微应用：update', props)
        },
    })
}

// 判断是否使用 qiankun ，保证项目可以独立运行
qiankunWindow.__POWERED_BY_QIANKUN__ ? initQianKun() : render()

