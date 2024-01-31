const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('node:path');
const redis = require('redis');

// 创建Redis客户端实例
const client = redis.createClient({
    url: 'redis://r-2vcib6ac5f2v70202lpd.redis.cn-chengdu.rds.aliyuncs.com:6379',
    password: "Hdb123456@",
});

// 监听错误事件
client.on('error', (err) => {
    console.error('Redis Client Error', err);
});

// 连接到Redis服务器
client.connect();

async function handleOpenCarKeyword(event, args) {
    console.info("收到键盘操作事件: ", args)
    // 发布事件
    try {
        return await client.publish("open_car", args);
    } catch (err) {
        return `Error performing Redis operations: ${err}`
    }
}

const createWindow = () => {
    try {
        // Create the browser window.
        const mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js')
            }
        })

        // 加载 index.html
        // mainWindow.loadFile('index.html')
        mainWindow.loadURL('http://localhost:7002/')

        // 打开开发工具
        mainWindow.webContents.openDevTools()
    } catch (e) {
        console.error('Failed to create window:', error);
    }
}

// 这段程序将会在 Electron 结束初始化
// 和创建浏览器窗口的时候调用
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(() => {
    // 自定义事件监听
    ipcMain.handle('open_car:keyword', handleOpenCarKeyword)

    createWindow()
    app.on('activate', () => {
        // 在 macOS 系统内, 如果没有已开启的应用窗口
        // 点击托盘图标时通常会重新创建一个新窗口
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 因此, 通常
// 对应用程序和它们的菜单栏来说应该时刻保持激活状态,
// 直到用户使用 Cmd + Q 明确退出
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

// 在当前文件中你可以引入所有的主进程代码
// 也可以拆分成几个文件，然后用 require 导入。