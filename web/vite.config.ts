import path from "path";
import {defineConfig} from "vite";
import {viteMockServe} from "vite-plugin-mock";
import qiankun from 'vite-plugin-qiankun'
import fs from 'fs';

// 版本号打包方案
// var pkg = require('./package.json')

export default (params) => defineConfig({
    base: "/",
    plugins: [
        qiankun('ReactApp', { // 微应用名字，与主应用注册的微应用名字保持一致
            useDevMode: true
        }),
        //mock数据
        params.mode === 'local' &&
        viteMockServe({
            mockPath: './mock',
            localEnabled: true,
        }),
    ],
    resolve: {
        //别名
        alias: {
            "~": path.resolve(__dirname, "./"), // 根路径
            "@": path.resolve(__dirname, "src"), // src 路径
        },
    },
    css: {
        //* css模块化
        modules: { // css模块化 文件以.module.[css|less|scss]结尾
            generateScopedName: '[name]__[local]___[hash:base64:5]',
            hashPrefix: 'prefix',
        },
        //* 预编译支持less
        preprocessorOptions: {
            less: {
                // 支持内联 JavaScript
                javascriptEnabled: true,
            },
        },
    },
    build: {
        // outDir: `dist/${pkg.version}`
        outDir: `micro/app`
    },
    server: {
        port: 7002,
        host: "0.0.0.0",
        open: false,
        // https: {
        //     key: fs.readFileSync('./configs/server.key'),
        //     cert: fs.readFileSync('./configs/server.crt'),
        // },
        proxy: {
          "/gpt": {
            target: "http://your.gpt.com",
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/gpt/, ""),
          },
        },
    },
});