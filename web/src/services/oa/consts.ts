export const DefaultPoolInfo: OaAPI.PoolInfo = {
    pool_num: 0,
    oa_num: 0,
    user_type: "user",
    effective_oa_num: 0,
    list: [],
    config: {
        is_limit: false,
        limited_duration: 0,
        max_limit_num: 0,
        is_lock: false,
        lock_duration: 0,
    },
    auth: {
        secret_key: "",
        access_key: {},
    },
}