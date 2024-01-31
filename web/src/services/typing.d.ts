declare namespace COM_API {
    interface Response {
        code: number;  // 业务状态码
        data: any; // 业务数据
        msg: string; // 错误信息

        server_time: string; // 服务器时间

        version: string; // 当前版本号
    }

    interface Request {
        __task_id?: string;
    }

    interface Pager {
        page: number;
        pages: number;
        total: number;
        page_size: number;
        max_page_size: number;
        page_param: string;
        page_size_param: string;
    }
}