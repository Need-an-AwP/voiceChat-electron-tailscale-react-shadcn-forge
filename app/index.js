const path = require('path')
const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron')
const koffi = require('koffi');
const socketIo = require('socket.io');
const http = require('http')
const express = require('express')
const cors = require('cors');
const { exec } = require('child_process')
const { throttle } = require('lodash');
const fs = require('fs');
const { debounce } = require('lodash');
let isSaving = false;
const isDev = process.env.IS_DEV === 'true'



function generateUUID() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${timestamp}${random}`;
}
const uuid = generateUUID()

let controllerUrl = 'http://1.12.226.82:8080'
let nodeServerUrl = 'http://1.12.226.82:3000'

const dllPath = isDev
    ? path.join(__dirname, '..', 'go_module', 'tailscale-go-interacte.dll')
    : path.join(process.resourcesPath, 'tailscale-go-interacte.dll');
const lib = koffi.load(dllPath);
const StartCheckTailscaleStatusLoop = lib.func('StartCheckTailscaleStatusLoop', 'void', [])
const CheckTailscaleStatus = lib.func('CheckTailscaleStatus', 'str', [])
const GetStatus = lib.func('GetStatus', 'str', [])
const StartPingCheck = lib.func('StartPingCheck', 'void', [])
const GetPingResults = lib.func('GetPingResults', 'str', [])
//StartCheckTailscaleStatusLoop()
//StartPingCheck()

const expressApp = express()
expressApp.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
}));
expressApp.get('/', (req, res) => {
    res.send('this is a signaling sErVeR');
})
const server = http.createServer(expressApp);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})

function getClientIp(socket) {
    let clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    // 如果是 IPv6 地址，去掉 IPv4-mapped 前缀
    if (clientIp.substr(0, 7) == "::ffff:") {
        clientIp = clientIp.substr(7);
    }
    return clientIp;
}
const socketMap = new Map();
io.on('connection', (socket) => {
    const clientIp = getClientIp(socket);
    console.log('New client connected', clientIp);
    socketMap.set(clientIp, socket);

    socket.on('ping', () => {
        socket.emit('pong')
    })

    socket.on('offer', (msg) => {
        console.log('received offer from', JSON.parse(msg).offerIP)
        win.webContents.send('offer', JSON.parse(msg))
    })

    socket.on('icecandidate', (msg) => {
        win.webContents.send('icecandidate', JSON.parse(msg))
    })

    socket.emit('uuid', uuid)

    socket.on('requestOffer', (msg) => {
        console.log('received requestOffer from', JSON.parse(msg).receiverIP)
        win.webContents.send('requestOffer', JSON.parse(msg))
    })
})


server.listen(8848, '::', () => {
    console.log('server online')
    //isServerRunning = true
})

ipcMain.on('replyOffer', async (e, d) => {
    console.log('replyOffer', d['offerIP'])
    const { ipv4, ipv6 } = d['offerIP']
    let socket = socketMap.get(ipv4) || socketMap.get(ipv6);
    if (socket) {
        socket.emit('answer', JSON.stringify(d));
    } else {
        console.log('No socket found for IP addresses:', ipv4, ipv6);
    }
})


ipcMain.on('requestJSON', (e, d) => {
    console.log('read json files from resources')

    fs.readFile(path.join(__dirname, '../resources/chat_channel.json'), 'utf8', (err, data) => {
        if (err) {
            console.error(err);
        } else {
            win.webContents.send('chat_channel', JSON.parse(data))
        }
    });

    fs.readFile(path.join(__dirname, '../resources/config.json'), 'utf8', (err, data) => {
        if (err) {
            console.error(err);
        } else {
            win.webContents.send('config', JSON.parse(data))
            controllerUrl = JSON.parse(data).controllerUrl
            nodeServerUrl = JSON.parse(data).nodeServerUrl
        }
    });
})

// 使用防抖函数来处理保存操作
let savePromise = Promise.resolve();
const debouncedSaveFile = debounce((filePath, data) => {
    if (!isSaving) {
        isSaving = true;
        const startTime = Date.now();
        //console.log(`Starting file write to ${filePath}...`);
        savePromise = new Promise((resolve) => {
            fs.writeFile(filePath, data, (err) => {
                const endTime = Date.now();
                const duration = endTime - startTime;
                if (err) {
                    console.error(`Error saving file to ${filePath}:`, err);
                } else {
                    console.log(`File write to ${filePath} completed in ${duration}ms`);
                }
                isSaving = false;
                resolve();
            });
        });
    }
}, 1000);

ipcMain.on('saveChatChannel', (e, d) => {
    console.log('saveChatChannel')
    const chatFilePath = path.join(__dirname, '../resources/chat_channel.json');
    debouncedSaveFile(chatFilePath, d);
});

ipcMain.on('saveConfig', (e, d) => {
    const configFilePath = path.join(__dirname, '../resources/config.json');
    debouncedSaveFile(configFilePath, d);
});


ipcMain.on('joinNetwork', (e, d) => {
    console.log('joinNetwork', d);

    exec('tailscale logout', (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        } else if (stderr) {
            console.error(stderr)
            return
        }

        console.log('tailscale logout success', stdout)

        const command = `tailscale login --login-server ${controllerUrl} --authkey ${d} --accept-dns=false`
        exec(command, (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                return;
            } else if (stderr) {
                console.error(stderr)
                return
            }
            console.log('tailscale login to new network success', stdout);
        });
    })
})



//get electron process id
let cachedElectronPids = [];
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 10000; // 10 seconds
function getElectronProcessIds() {
    return new Promise((resolve, reject) => {
        const currentTime = Date.now();
        if (currentTime - lastUpdateTime < UPDATE_INTERVAL) {
            resolve(cachedElectronPids);
            return;
        }

        const command = process.platform === 'win32'
            ? `wmic process where "CommandLine like '%${process.execPath.replace(/\\/g, '\\\\')}%'" get ProcessId`
            : `pgrep -f "${process.execPath}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            const pids = stdout.split('\n')
                .map(line => parseInt(line.trim()))
                .filter(pid => !isNaN(pid));

            cachedElectronPids = pids;
            lastUpdateTime = currentTime;
            resolve(pids);
        });
    });
}
const throttledGetElectronProcessIds = throttle(getElectronProcessIds, UPDATE_INTERVAL);
ipcMain.handle('getElectronPids', (e, d) => {
    return throttledGetElectronProcessIds()
})

if (require('electron-squirrel-startup')) {
    app.quit()
}


let webrtcInternalsWindow = null
function createWebRTCInternalsWindow() {
    webrtcInternalsWindow = new BrowserWindow({
        width: 400,
        height: 800,
    })
    webrtcInternalsWindow.loadURL('chrome://webrtc-internals/')
    webrtcInternalsWindow.on('closed', () => {
        webrtcInternalsWindow = null
    })
}

let win = null
function createWindow() {
    win = new BrowserWindow({
        width: 1286,
        height: 844 + 32,
        autoHideMenuBar: true,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: true,
            webSecurity: true,
            //webviewTag: true,
            devTools: true,
            experimentalFeatures: false,
            spellcheck: false,
        }
    })

    ipcMain.on('minimize-window', () => {
        win.minimize();
    });

    ipcMain.on('maximize-window', () => {
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    });

    ipcMain.on('close-window', () => {
        win.close();
    });

    if (isDev) {
        win.loadURL('http://localhost:5173')
        win.webContents.openDevTools({ mode: 'detach' })
    } else {
        win.loadFile(path.join(__dirname, '../dist', 'index.html'))
        win.webContents.openDevTools({ mode: 'detach' })
    }


    win.on('closed', () => {
        win = null
        if (webrtcInternalsWindow && !webrtcInternalsWindow.isDestroyed()) {
            webrtcInternalsWindow.close()
        }
    })
}


app.whenReady().then(() => {
    setInterval(() => {
        win.webContents.send('self_uuid', uuid)
        //const status = GetStatus()
        const status = CheckTailscaleStatus()
        //console.log('status', typeof(status))
        const pingResult = GetPingResults()
        win.webContents.send('status_channel', status)
        if (pingResult !== '{}') {
            win.webContents.send('status_channel_ping', pingResult)
        }
    }, 3000);

    createWindow()
    createWebRTCInternalsWindow()
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
            createWebRTCInternalsWindow()
        }
    })
})

app.on('window-all-closed', async function () {
    if (process.platform !== 'darwin') {
        await savePromise;
        app.quit()
    }
})