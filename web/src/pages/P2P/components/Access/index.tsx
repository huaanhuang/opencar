import {FC, ReactElement, useState} from "react";
import style from "./index.module.less"
import {Button, Input, Space} from 'antd';
import {useParams} from "react-router-dom";

interface IProps {
    setAccess: (acc: boolean) => void
}

const Access: FC<IProps> = ({setAccess}): ReactElement => {

    const params: any = useParams()

    const [access_key, setAccessKey] = useState<string>("")

    const saveAccessKey = () => {
        window.localStorage.setItem(params.app_key, access_key)
        setAccess(true)
    }

    return (
        <div className={style.accessContainer}>
            <div className={style.label}>请输入访问密钥:</div>
            <div className={style.content}>
                <Space.Compact style={{width: '100%'}}>
                    <Input size={"large"} placeholder={"请输入你的访问密钥"}
                           onChange={(e) => setAccessKey(e.target.value)}/>
                    <Button size={"large"} type="primary" onClick={saveAccessKey}>确定</Button>
                </Space.Compact>
            </div>
        </div>
    )
}


export default Access