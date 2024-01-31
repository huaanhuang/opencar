import styles from './index.module.less'
import React, {FC, ReactElement, useMemo} from 'react';
import * as echarts from "echarts";
import ReactECharts from "echarts-for-react";

interface IProps {
    title: string[];
    data: number[];
    style?: React.CSSProperties;
}

const Top10: FC<IProps> = ({ title, data, style }): ReactElement => {

    const option = useMemo((): echarts.EChartsOption => {
        return {
            tooltip: {
                trigger: 'axis',
                backgroundColor: "#254e6e",
                borderColor: "#254e6e",
                textStyle: {
                    color: "white",
                },
                // 自定义提示框内容
                formatter: (params) => {
                    // params 是一个数组，包含了每个系列的数据信息
                    let result = '';
                    // @ts-ignore
                    params.forEach((param: any) => {
                        // param 是一个对象，包含了当前系列的数据信息
                        const { seriesName, value, dataIndex } = param;
                        const name = title[dataIndex]; // 获取当前数据对应的类目名称
                        result += `${name}: ${value}<br/>`; // 格式化显示的字符串
                    });
                    return result;
                }
            },
            xAxis: {
                max: 'dataMax'
            },
            yAxis: {
                type: 'category',
                data: title,
                inverse: true,
                animationDuration: 300,
                animationDurationUpdate: 300,
                // max: 2 // only the largest 3 bars will be displayed
                // 自定义类目轴标签
                axisLabel: {
                    // 使用 formatter 函数来格式化标签文本
                    formatter: (value: any, index: number) => {
                        // value 是类目的名称，index 是类目的索引
                        // 你可以根据 value 和 index 来自定义显示的文本
                        return value.slice(0, 3);
                    },
                },
            },
            series: [
                {
                    realtimeSort: true,
                    name: 'X',
                    type: 'bar',
                    data: data,
                    barWidth: 10,
                    barCategoryGap: 10,
                    color: "#0775c8",
                    label: {
                        show: true,
                        position: 'right',
                        valueAnimation: true
                    }
                }
            ],
            legend: {
                show: false,
                height: "0"
            },
            animationDuration: 0,
            animationDurationUpdate: 3000,
            animationEasing: 'linear',
            animationEasingUpdate: 'linear'
        };
    }, [data, title])

    return (
        <div className={styles.top10Container}>
            <ReactECharts
                option={option}
                style={{marginLeft: "15px"}}
                // style={{top: "-40px", backgroundColor: "red"}}
                // style={style ? style : {height: "100%", width: "100%"}}
            />
        </div>
    )
}

export default Top10;