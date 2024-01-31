declare namespace SignApi {
    interface Params_Query_Credentials {
        service: string;
        username: string;
    }

    interface Result_Query_Credentials extends COM_API.Response {
        data: Credentials
    }

    interface Credentials {
        username: string;
        password: string;
        ttl: number;
        uris: string[];
    }

    // 身份标识
    type Identity = string
}
