import {request} from "@/utils/request";

export async function queryCredentials(
    params: SignApi.Params_Query_Credentials,
    options?: { [key: string]: any },
) {
    return request<SignApi.Result_Query_Credentials>('/turn', {
        method: 'GET',
        params: {
            ...params,
        },
        ...(options || {}),
    });
}