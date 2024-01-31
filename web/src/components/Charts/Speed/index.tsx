import React, {FC, ReactElement, useMemo} from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

interface IProps {
    value: number;
    max: number;
    formatter: string;
}

const Speed: FC<IProps> = ({value, max, formatter}): ReactElement => {

    const option = useMemo((): echarts.EChartsOption => {
        return {
            series: [
                {
                    type: 'gauge',
                    max: max,
                    axisLine: {
                        lineStyle: {
                            width: 10,
                            color: [
                                [0.3, '#67e0e3'],
                                [0.7, '#37a2da'],
                                [1, '#fd666d']
                            ]
                        }
                    },
                    pointer: {
                        itemStyle: {
                            color: 'auto'
                        }
                    },
                    axisTick: {
                        distance: -30,
                        length: 5,
                        lineStyle: {
                            color: '#fff',
                            width: 2,
                        }
                    },
                    splitLine: {
                        distance: -30,
                        length: 10,
                        lineStyle: {
                            color: '#fff',
                            width: 4
                        }
                    },
                    axisLabel: {
                        color: 'inherit',
                        distance: 40,
                        fontSize: 12
                    },
                    detail: {
                        valueAnimation: true,
                        formatter: formatter,
                        color: '#fff',
                        fontSize: '20px',
                    },
                    data: [
                        {
                            value: value
                        }
                    ]
                }
            ]
        }
    }, [value])

    return (
        <ReactECharts
            option={option}
        />
    )
}

export default Speed;