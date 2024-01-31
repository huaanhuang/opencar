import {request} from "@/utils/request";

export async function queryOaInfo(
    params: OaAPI.Params_Query_Oa_Info,
    options?: { [key: string]: any },
) {
    return request<OaAPI.Result_Query_Oa_Info>('/oa/Overview', {
        method: 'GET',
        params: {
            ...params,
        },
        headers: {
            "Access-Oa-Key": window.localStorage.getItem(params.app_key) || ""
        },
        ...(options || {}),
    });
}

export async function modifyConfig(
    params: OaAPI.Params_Modify_Config,
    options?: { [key: string]: any },
) {
    return request<OaAPI.Result_Modify_Config>('/oa/Config', {
        method: 'POST',
        data: {
            ...params,
        },
        headers: {
            "Access-Oa-Key": window.localStorage.getItem(params.app_key) || ""
        },
        ...(options || {}),
    });
}

export async function modifySecret(
    params: OaAPI.Params_Modify_Secret,
    options?: { [key: string]: any },
) {
    return request<OaAPI.Result_Modify_Secret>('/oa/Secret', {
        method: 'POST',
        data: {
            ...params,
        },
        headers: {
            "Access-Oa-Key": window.localStorage.getItem(params.app_key) || ""
        },
        ...(options || {}),
    });
}

export async function modifyAccessKey(
    params: OaAPI.Params_Modify_Access_Key,
    options?: { [key: string]: any },
) {
    return request<OaAPI.Result_Modify_Access_Key>('/oa/AccessKey', {
        method: 'POST',
        data: {
            ...params,
        },
        headers: {
            "Access-Oa-Key": window.localStorage.getItem(params.app_key) || ""
        },
        ...(options || {}),
    });
}