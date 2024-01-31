// import * as echarts from "echarts";
// import ReactECharts from "echarts-for-react";
// import React, {FC, ReactElement, useMemo} from "react";
//
// interface IProps {
//     title: string[];
//     sent: number[];
//     recv: number[];
// }
//
// const Area: FC<IProps> = ({title, sent, recv}): ReactElement => {
//     // 使用useMemo来记住option对象，只有当title, sent, recv变化时才重新计算
//     const option = useMemo((): echarts.EChartsOption => {
//         console.log("set option", title, sent, recv)
//         return {
//             tooltip: {
//                 trigger: 'axis',
//                 axisPointer: {
//                     type: 'cross',
//                     label: {
//                         backgroundColor: '#6a7985'
//                     }
//                 }
//             },
//             grid: {
//                 // left: '3%',
//                 // right: '4%',
//                 // bottom: '3%',
//                 // containLabel: true
//             },
//             xAxis: [
//                 {
//                     type: 'category',
//                     boundaryGap: false,
//                     data: title
//                 }
//             ],
//             yAxis: [
//                 {
//                     type: 'value'
//                 }
//             ],
//             series: [
//                 {
//                     name: '上行',
//                     type: 'line',
//                     stack: 'Total',
//                     areaStyle: {},
//                     emphasis: {
//                         focus: 'series'
//                     },
//                     data: sent,
//                     // color: "#f1785f",
//                 },
//                 {
//                     name: '下行',
//                     type: 'line',
//                     stack: 'Total',
//                     areaStyle: {},
//                     emphasis: {
//                         focus: 'series'
//                     },
//                     data: recv,
//                     // color: "#2877ca",
//                 },
//             ]
//         }
//     }, [title, sent, recv]); // 依赖数组，只有这些属性变化时才重新计算option
//
//     return (
//         <ReactECharts
//             option={option}
//             // style={{padding: "0 5px", top: "-40px"}}
//             style={{ height: '300px', width: '100%', padding: "0 5px" }}
//             // style={style ? style : {height: "100%", width: "100%"}}
//         />
//     )
// }
//
// export default Area;

import * as echarts from 'echarts';
import React, { FC, useEffect, useRef } from 'react';

interface IProps {
    title: string[];
    sent: number[];
    recv: number[];
}

const Area: FC<IProps> = ({ title, sent, recv }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts>();

    useEffect(() => {
        // 初始化图表实例
        if (chartRef.current) {
            chartInstance.current = echarts.init(chartRef.current);
        }

        return () => {
            // 组件卸载时，销毁图表实例
            chartInstance.current?.dispose();
        };
    }, []);

    useEffect(() => {
        // 设置图表选项
        const option: echarts.EChartsOption = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    label: {
                        backgroundColor: '#6a7985',
                    },
                },
            },
            xAxis: [
                {
                    type: 'category',
                    boundaryGap: false,
                    data: title,
                },
            ],
            yAxis: [
                {
                    type: 'value',
                },
            ],
            series: [
                {
                    name: '上行',
                    type: 'line',
                    stack: 'Total',
                    areaStyle: {},
                    emphasis: {
                        focus: 'series',
                    },
                    data: sent,
                },
                {
                    name: '下行',
                    type: 'line',
                    stack: 'Total',
                    areaStyle: {},
                    emphasis: {
                        focus: 'series',
                    },
                    data: recv,
                },
            ],
        };

        // 使用刚指定的配置项和数据显示图表。
        chartInstance.current?.setOption(option);
    }, [title, sent, recv]); // 当这些依赖项变化时，重新设置图表选项

    return <div ref={chartRef} style={{ height: '100%', width: '100%', top: "-40px" }} />;
};

export default Area;