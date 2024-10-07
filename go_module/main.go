package main

import (
	"C"
	"context"
	"encoding/json"
	"fmt"
	"github.com/go-ping/ping"
	"log"
	"net"
	"sync"
	"tailscale.com/client/tailscale"
	"time"
)

var (
	app     *App
	appOnce sync.Once
)

type PingResult struct {
	IP       string
	Latency  float64
	Received int
	Sent     int
}

type App struct {
	ctx         context.Context
	client      tailscale.LocalClient
	statusStr   string
	onlinePeers [][]string
	pingResults map[string]PingResult
}

func NewApp() *App {
	return &App{
		ctx: context.Background(),
	}
}

// 初始化 App 的函数，只执行一次
func initApp() {
	appOnce.Do(func() {
		app = &App{
			ctx:         context.Background(),
			onlinePeers: [][]string{}, //onlinePeers is replaced compeletely no need init it
			pingResults: make(map[string]PingResult),
		}
	})
}

// 检查 App 是否已初始化的辅助函数，如果未初始化则自动初始化
func getApp() *App {
	initApp()
	return app
}

func pingCheck() {
	var wg sync.WaitGroup
	app := getApp()
	// Add a mutex to protect concurrent access to pingResults
	var mutex sync.Mutex
	for {
		for _, peerList := range app.onlinePeers {
			for _, ip := range peerList {
				if net.ParseIP(ip).To4() != nil {
					wg.Add(1)
					go func(ip string) {
						defer wg.Done()
						pinger, _ := ping.NewPinger(ip)
						pinger.Count = 1
						pinger.Timeout = time.Millisecond * 2000
						pinger.SetPrivileged(true)
						pinger.OnFinish = func(s *ping.Statistics) {
							//fmt.Println(s)
							//runtime.EventsEmit(a.ctx, "status_channel_ping", s)
							result := PingResult{
								IP:       ip,
								Latency:  float64(s.AvgRtt) / float64(time.Millisecond),
								Received: s.PacketsRecv,
								Sent:     s.PacketsSent,
							}
							// Lock the mutex before writing to the map
							mutex.Lock()
							app.pingResults[ip] = result
							mutex.Unlock()
						}
						if err := pinger.Run(); err != nil {
							result := PingResult{
								IP:       ip + "(Ping Failed)",
								Latency:  0,
								Received: 0,
								Sent:     0,
							}
							// Lock the mutex before writing to the map
							mutex.Lock()
							app.pingResults[ip] = result
							mutex.Unlock()
						}
					}(ip)
				}
			}
		}
		wg.Wait()
		time.Sleep(time.Second * 1)
	}
}

//export StartPingCheck
func StartPingCheck() {
	app := getApp()
	if len(app.onlinePeers) == 0 {
		CheckTailscaleStatus()
	}
	go pingCheck()
}

//export GetPingResults
func GetPingResults() *C.char {
	jsonData, err := json.Marshal(app.pingResults)
	if err != nil {
		return C.CString(fmt.Sprintf("Error marshaling ping results: %v", err))
	}

	return C.CString(string(jsonData))
}

type StatusWithTime struct {
	Status        interface{} `json:"status"`
	ExecutionTime int64       `json:"executionTime"`
}

func checkTailscaleStatusLoop() {
	app := getApp()
	for {
		status, err := app.client.Status(app.ctx)
		if err != nil {
			log.Printf("Error getting Tailscale status: %v", err)
			app.statusStr = "Error getting Tailscale status"
		}

		if status.BackendState != "Running" {
			watcher, err := app.client.WatchIPNBus(app.ctx, 0)
			if err != nil {
				log.Printf("Loading IPN bus watcher: %s\n", err)
				app.statusStr = "Error loading IPN bus watcher"
			}

			for {
				notify, err := watcher.Next()
				if err != nil {
					log.Printf("Watching IPN Bus error: %s\n", err)
					continue
				}
				if notify.State != nil {
					break
				}
			}
		}
		var onlinePeers [][]string
		for _, v := range status.Peer {
			if v.Online {
				var peerIPs []string
				for _, value := range v.TailscaleIPs {
					peerIPs = append(peerIPs, value.String())
				}
				onlinePeers = append(onlinePeers, peerIPs)
			}
		}
		app.onlinePeers = onlinePeers

		statusWithTime := StatusWithTime{
			Status:        status,
			ExecutionTime: time.Now().Unix(),
		}

		statusJSON, err := json.MarshalIndent(statusWithTime, "", "  ")
		if err != nil {
			log.Printf("Error converting status to JSON: %v", err)
			app.statusStr = "Error converting status to JSON"
		}
		app.statusStr = string(statusJSON)
		time.Sleep(time.Second * 3)
	}
}

//export StartCheckTailscaleStatusLoop
func StartCheckTailscaleStatusLoop() {
	go checkTailscaleStatusLoop()
}

//export GetStatus
func GetStatus() *C.char {
	return C.CString(app.statusStr)
}

//export CheckTailscaleStatus
func CheckTailscaleStatus() *C.char {
	//app := NewApp()
	app := getApp()

	status, err := app.client.Status(app.ctx)
	if err != nil {
		log.Printf("Error getting Tailscale status: %v", err)
		return C.CString("Error getting Tailscale status")
	}

	if status.BackendState != "Running" {
		watcher, err := app.client.WatchIPNBus(app.ctx, 0)
		if err != nil {
			log.Printf("Loading IPN bus watcher: %s\n", err)
			return C.CString("Error loading IPN bus watcher")
		}

		for {
			notify, err := watcher.Next()
			if err != nil {
				log.Printf("Watching IPN Bus error: %s\n", err)
				continue
			}
			if notify.State != nil {
				break
			}
		}
	}
	var onlinePeers [][]string
	for _, v := range status.Peer {
		if v.Online { //&& (v.RxBytes == 0 || v.TxBytes == 0){
			var peerIPs []string
			for _, value := range v.TailscaleIPs {
				peerIPs = append(peerIPs, value.String())
			}
			onlinePeers = append(onlinePeers, peerIPs)
		}
	}
	app.onlinePeers = onlinePeers

	statusJSON, err := json.MarshalIndent(status, "", "  ")
	if err != nil {
		log.Printf("Error converting status to JSON: %v", err)
		return C.CString("Error converting status to JSON")
	}

	return C.CString(string(statusJSON))
}

//export HelloWorld
func HelloWorld() *C.char {
	return C.CString("Hello, World from Go!")
}

//export Hello
func Hello(name *C.char) *C.char {
	returnStr := fmt.Sprintf("Hello, %s!", C.GoString(name))
	return C.CString(returnStr)
}

//export AsyncTestFunc
func AsyncTestFunc() *C.char {
	time.Sleep(time.Second * 3)
	return C.CString("this should return after 3s")
}

func main() {}
