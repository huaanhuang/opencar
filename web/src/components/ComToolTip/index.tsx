import styles from './index.module.less'
import {CSSProperties, FC, ReactElement} from "react";
import {Tooltip} from "antd";

interface IProps {
    content: string;  // 文本
    classname?: string; // 类名
    style?: CSSProperties;  // 样式
    color?: string;  // 颜色
}

const ComToolTip: FC<IProps> = ({content, classname, style, color}): ReactElement => {

    return (
        <Tooltip title={content} color={color}>
            <div style={style} className={`${styles.content} ${classname}`}>{content}</div>
        </Tooltip>
    )
}

export default ComToolTip;