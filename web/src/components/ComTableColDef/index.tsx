import {ReactElement} from "react";

const ComTableColDef = (props: any): ReactElement => {
    return (
        <>
            {props.children === "" ? "-" : props.children}
        </>
    )
}

export default ComTableColDef;