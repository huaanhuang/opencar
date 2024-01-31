import {useEffect, useRef} from "react";

function loadAMap(callback: any) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://webapi.amap.com/maps?v=1.4.15&key=YOUR_API_KEY&plugin=AMap.Walking';
    script.onload = () => callback();
    document.head.appendChild(script);
}

loadAMap(() => {
    // 初始化地图和Walking服务
    // @ts-ignore
    const map = new window.AMap.Map('mapContainer', {
        zoom: 10,
        center: [116.397428, 39.90923],
    });

    // @ts-ignore
    const walking = new window.AMap.Walking({
        map: map,
    });

    // ...其他代码
});

const Navigation = () => {

    const mapContainerId = 'map-container';

    const map = useRef<any>()

    useEffect(() => {
        loadAMap(() => {
            // 初始化地图
            // @ts-ignore
            map.current = new window.AMap.Map(mapContainerId, {
                zoom: 10,
                center: [116.397428, 39.90923], // 示例坐标点（北京天安门）
            });

            // 添加导航控件，这里以步行导航为例
            // @ts-ignore
            const walking = new window.AMap.Walking({
                map: map.current,
            });

            // 根据起点和终点坐标规划步行路线
            walking.search([116.397428, 39.90923], [116.405285, 39.904989], (status: any, result: any) => {
                // result即是对应的步行路线数据信息
            });
        });


        // 组件卸载时清理地图实例
        return () => {
            if (map.current) {
                map.current.destroy();
            }
        };
    }, []);

    return <div id={mapContainerId} style={{ width: '100%', height: '100%' }} />;
}

export default Navigation;