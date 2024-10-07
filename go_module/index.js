const koffi = require('koffi');

// 加载 DLL 文件
const lib = koffi.load('./tailscale-go-interacte.dll');


const CheckTailscaleStatus = lib.func('CheckTailscaleStatus', 'str', [])
const StartCheckTailscaleStatusLoop = lib.func('StartCheckTailscaleStatusLoop', 'void', [])
const GetStatus = lib.func('GetStatus', 'str', [])
const StartPingCheck = lib.func('StartPingCheck', 'void', [])
const GetPingResults = lib.func('GetPingResults', 'str', [])


//console.log(CheckTailscaleStatus())
StartCheckTailscaleStatusLoop()
StartPingCheck()
setInterval(() => {
    console.log(JSON.parse(GetStatus()))
    const results = JSON.parse(GetPingResults())
    console.log(Date.now(), results)
}, 1000);

//lib.unload()
