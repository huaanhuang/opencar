import {useEffect} from "react";
import {OnJoin} from "@/services/sign/consts";
import AnswerService from "@/services/sign/AnswerService";
import Message = SignApi.Message;

const Answer = () => {

    useEffect(() => {
        let service = new AnswerService()
        service.emitter.on(OnJoin, (msg: Message) => {
            console.log(msg)
        })
        service.init()
    }, [])

    return (
        <div>
            answer
        </div>
    )
}

export default Answer