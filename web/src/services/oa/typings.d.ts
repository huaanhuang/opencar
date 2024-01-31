declare namespace OaAPI {

    interface Params_Query_Oa_Info {
        app_key: string;
    }

    interface Result_Query_Oa_Info extends COM_API.Response {
        data: PoolInfo;
    }

    interface PoolInfo {
        pool_num: number;
        oa_num: number;
        effective_oa_num: number;
        user_type: string;
        list: PoolInfoItem[];
        config: Config;
        auth: Auth;
    }

    interface PoolInfoItem {
        pool_key: string;
        oa_num: number;
        effective_oa_num: number;
        node_num: number;
        users: UserInfoItem[];
    }

    interface UserInfoItem {
        rtx: string;
        status: number;
        expired_at: string;
        last_active_time: string;
    }

    interface Config {
        is_limit: boolean;
        limited_duration: number;
        max_limit_num: number;
        is_lock: boolean;
        lock_duration: number;
    }

    interface Auth {
        secret_key: string;
        access_key: { [key: string]: string }
    }

    interface Params_Modify_Config {
        app_key: string;
        is_limit: boolean;
        limited_duration: number;
        max_limit_num: number;
        is_lock: boolean;
        lock_duration: number;
    }

    interface Result_Modify_Config extends COM_API.Response {

    }

    interface Params_Modify_Secret {
        app_key: string;
        secret_key: string;
    }

    interface Result_Modify_Secret extends COM_API.Response {

    }

    interface Params_Modify_Access_Key {
        app_key: string;
        keynote_name: string;
        access_key: string;
    }

    interface Result_Modify_Access_Key extends COM_API.Response {

    }
}
