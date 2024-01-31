import axios, {AxiosResponse} from 'axios';
import {notification} from 'antd';
import {AxiosRequestConfig} from "axios/index";

const instance = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL,
    timeout: 5000,
    withCredentials: false,
});

const codeMessage: any = {
    200: '服务器成功返回请求的数据。',
    201: '新建或修改数据成功。',
    202: '一个请求已经进入后台排队（异步任务）。',
    204: '删除数据成功。',
    400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
    401: '用户没有权限（令牌、用户名、密码错误）。',
    403: '用户得到授权，但是访问是被禁止的。',
    404: '服务器找不到请求的资源',
    406: '请求的格式不可得。',
    410: '请求的资源被永久删除，且不会再得到的。',
    422: '当创建一个对象时，发生一个验证错误。',
    500: '服务器发生错误，请检查服务器。',
    502: '网关错误。',
    503: '服务不可用，服务器暂时过载或维护。',
    504: '网关超时。',
};

const ywCode: { [key: number]: string} = {
    200404: "处罚记录不存在",
}

const checkStatus = (response: AxiosResponse) => {
    if (response.status >= 200 && response.status < 300) {
        return response;
    }
    const errorText = codeMessage[response.status] || response.statusText;
    notification.error({message: `请求错误 ${response.status}`, description: errorText});
    const error: any = new Error(errorText);
    error.name = response.status;
    error.response = response;
    throw error;
};

instance.interceptors.request.use((config: any) => {
    if (config.headers && !config.headers.Token) {
        config.headers.Token = window.localStorage.getItem("token") || "token"
    }
    if (config.method === 'POST' || config.method === 'PUT' || config.method === 'DELETE') {
        if (!(config.body instanceof FormData)) {
            config.headers = {
                Accept: 'application/json',
                'Content-Type': 'application/json; charset=utf-8',
                ...config.headers,
            };
            config.body = JSON.stringify(config.body);
        } else {
            // config.body is FormData
            config.headers = {
                Accept: 'application/json',
                ...config.headers,
            };
        }
    }
    return config;
});

instance.interceptors.response.use(
    (response: AxiosResponse) => {
        // 下载文件成功
        const res = checkStatus(response);
        if (res.headers['content-type'] === 'application/force-download') {
            return response;
        }
        // 下载文件流失败文件流转json失败提示
        if (res.request.responseType && res.request.responseType === 'blob') {
            // 将blob转为json
            const reader: any = new FileReader();
            let parseObj = null;
            reader.readAsText(res.data, 'utf-8');
            reader.onload = function () {
                parseObj = JSON.parse(reader.result);
                // notification.error({message: '请求失败', description: parseObj.message, duration: 3});
            };
            return response;
        }
        const {code, data, message} = res.data;
        // 需要自定义返回格式
        // @ts-ignore
        if (response.config.custom) {
            if (code === 0) return response;
            return response;
        }
        if (code === 0 || Object.keys(ywCode).indexOf(`${code}`) !== -1) return response;
        // 业务code，不做错误处理
        if (code === 4003) {
            // 权限校验失败
            notification.error({message: '请求失败', description: '暂无权限，请联系管理员配置权限'});
            return response;
        }
        if (code === 1005) {
            // OA登录过期或者未登录，清空用户信息缓存，跳转 IOA 重新登录
            window.location.href = import.meta.env.VITE_OA_LOGININ_URL;
            return response;
        }
        // notification.error({message: '请求失败', description: message});
        return response;
    },
    (error) => {
        if (error.response) {
            const {status, statusText} = error.response;
            const errorText = codeMessage[status] || statusText;
            notification.error({message: `请求错误 ${status}`, description: errorText});
        }
        return error;
    },
);

interface IRequest{
    <T = any>(url: string, opts: AxiosRequestConfig): Promise<T>; // getResponse 默认是 false， 因此不提供该参数时，只返回 data
    <T = any>(url: string): Promise<T>;  // 不提供 opts 时，默认使用 'GET' method，并且默认返回 data
}

export const request: IRequest = (url: string, opts: any = {method: 'GET'}) => {
    return new Promise((resolve, reject) => {
        instance.request({...opts, url}).then(res => {
            if (res.data.code === 0 || Object.keys(ywCode).indexOf(`${res.data.code}`) !== -1) {
                resolve(res.data)
            } else {
                reject(res.data)
            }
        }).catch(error => {
            reject(error)
        })
    })
};

export default instance;
