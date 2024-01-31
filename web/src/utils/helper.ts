// @ts-ignore
import CryptoJS from 'crypto-js';

export const getRandomUserId = (): string => {
    let num = 0;
    for (let i = 0; i < 6; i++) {
        num += Math.floor(Math.random() * 10);
    }
    return `${num}`;
}

export const md5Encrypt = (message: string): string => {
    const hash = CryptoJS.MD5(message);
    return hash.toString(CryptoJS.enc.Hex);
}

export const formatTimestampToMinutesAndSeconds = (timestamp: number): string => {
    // 创建一个新的Date对象，假设时间戳是以秒为单位
    const date = new Date(timestamp * 1000); // JavaScript的Date对象使用毫秒为单位，所以需要乘以1000
    // 获取分钟和秒数
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    // 返回格式化的时间
    return `${minutes}:${seconds}`;
}