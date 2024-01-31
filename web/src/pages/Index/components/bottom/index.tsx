import style from './index.module.less'
import BottomBgSide from '@/assets/home/bottom_bg_side.png'
import BottomMonitorBg from '@/assets/home/bottom_monitor_bg.png'

const Bottom = () => {

    return (
        <div className={style.bottomContainer}>
            <div className={style.content}>
                <img src={BottomBgSide} className={style.left}/>
                <img src={BottomMonitorBg} className={style.center}/>
                <img src={BottomBgSide} className={style.right}/>
            </div>
        </div>
    )
}

export default Bottom