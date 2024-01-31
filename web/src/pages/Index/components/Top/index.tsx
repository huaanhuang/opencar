import NavTopSide from "@/assets/home/nav_top_side.png";
import style from "./index.module.less";
import React from "react";

const Top = () => {

    return (
        <div className={style.topContainer}>
            <img src={NavTopSide}/>
            <div className={style.headerCenter}>
                <div className={style.title}>Dream Car</div>
            </div>
            <img src={NavTopSide} className={style.navRight}/>
        </div>
    )
}

export default Top