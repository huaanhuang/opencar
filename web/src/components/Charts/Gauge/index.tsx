import React, {FC, ReactElement, useEffect, useState} from 'react';
import ReactECharts from 'echarts-for-react'; // 引入ECharts的React包装器
import * as echarts from 'echarts'; // 引入ECharts核心库

const gaugeData = [
    {
        value: 50,
        name: 'CPU',
        title: {
            offsetCenter: ['0%', '-15%']
        },
        detail: {
            valueAnimation: true,
            offsetCenter: ['0%', '20%'],
        }
    },
];

interface IProps {
    color: string;
    bgColor: string;
    data: { [key: string]: any }
    formatter?: string;
    style?: any
}

const Gauge: FC<IProps> = ({
                               color,
                               bgColor,
                               data,
                               formatter = "{value}%",
                               style = undefined,
                           }): ReactElement => {

    const [sourceData, setSourceData] = useState<{ [key: string]: any }[]>([])

    useEffect(() => {
        setSourceData([
            {
                ...data,
                title: {
                    offsetCenter: ['0%', '-10%']
                },
                detail: {
                    valueAnimation: true,
                    offsetCenter: ['0%', '35%'],
                }
            }
        ])
    }, [data])

    // 定义得分环图表的配置
    const getOption = (): echarts.EChartsOption => {
        return {
            series: [
                {
                    type: 'gauge',
                    startAngle: 90,
                    endAngle: -270,
                    pointer: {
                        show: false
                    },
                    progress: {
                        show: true,
                        overlap: false,
                        roundCap: true,
                        clip: false,
                        itemStyle: {
                            borderWidth: 1,
                            borderColor: color,
                            color: color,
                        }
                    },
                    axisLine: {
                        lineStyle: {
                            width: 10, // 环的宽度
                            color: [
                                [1, bgColor] // 红色部分
                            ]
                        }
                    },
                    splitLine: {
                        show: false,
                        distance: 0,
                        length: 10
                    },
                    axisTick: {
                        show: false
                    },
                    axisLabel: {
                        show: false,
                        distance: 50
                    },
                    data: sourceData,
                    title: {
                        fontSize: 12,
                        color: "white",
                    },
                    detail: {
                        width: 25,
                        height: 10,
                        fontSize: 10,
                        color: 'white',
                        borderColor: 'white',
                        borderRadius: 20,
                        borderWidth: 1,
                        formatter: formatter
                    }
                }
            ]
        };
    };

    return (
        <ReactECharts
            option={getOption()}
            style={style ? style : {height: "100%", width: "100%"}}
        />
    );
}

export default Gauge