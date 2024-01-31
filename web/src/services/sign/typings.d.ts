declare namespace SignApi {
    interface Params_Query_Credentials {
        service: string;
        username: string;
    }

    interface Result_Query_Credentials extends COM_API.Response {
        data: {
            turn: Credentials;
            stun: Credentials;
        }
    }

    interface Credentials {
        username: string;
        password: string;
        ttl: number;
        uris: string[];
    }

    // 身份标识
    type Identity = string

    // ws 命令
    type Command = string

    // Emit 命令
    type Emit = string

    interface Message {
        cmd: Command;
        from: Identity;
        to: Identity;
        data: any;
    }
}
