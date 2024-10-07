import { useState } from "react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { useTailscale } from "../context/TailscaleContext"
import { useSocket } from "../context/SocketContext"
import { useRTC } from "../context/RTCContext"
import { Braces } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { WavyBackground } from "@/components/ui/wave-bg"


export default function RightSideBarCards() {
    const { ts_status, ts_peersIP, selfIPs, currentNetworkName } = useTailscale()
    const { latenciesInfoRef } = useSocket()
    const { rtcLocalPCs, rtcLocalFlags } = useRTC()
    const [hoveredCard, setHoveredCard] = useState(null);


    return (
        <ScrollArea className="h-[100%] p-4">
            <div className="flex flex-col space-y-2">
                {/*WebRTC Status */}
                <Card
                    className="bg-white bg-opacity-5"
                    onMouseEnter={() => setHoveredCard('webrtc')}
                    onMouseLeave={() => setHoveredCard(null)}
                >
                    <WavyBackground className="w-full" waveWidth={300} speed='fast' amplitude={200} blur={15}>
                        <ScrollArea className="h-full flex flex-col m-4">
                            {Object.keys(rtcLocalPCs).length !== 0 ?
                                <>{
                                    Object.keys(rtcLocalPCs).map((ip) =>
                                        <div className='p-2'>
                                            <strong className="flex justify-start">{ip}</strong>
                                            <div className='flex flex-row justify-between'>
                                                <span>{rtcLocalPCs[ip] !== null ? rtcLocalPCs[ip].iceConnectionState : 'no local pc exist'}</span>
                                                <strong>{rtcLocalFlags[ip] ? 'offer sender' : 'offer receiver'}</strong>
                                            </div>
                                        </div>
                                    )
                                }</>
                                :
                                <p>no webrtc connection exist</p>
                            }
                        </ScrollArea>
                    </WavyBackground>
                </Card>


                {/*Online Peers */}
                <Card
                    className={`p-4 ${hoveredCard === 'peers' ? 'bg-opacity-100' : 'bg-white bg-opacity-5'} transition duration-200`}
                    onMouseEnter={() => setHoveredCard('peers')}
                    onMouseLeave={() => setHoveredCard(null)}
                >
                    <h4 className="font-medium mb-2">Online Peers</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.keys(latenciesInfoRef.current).length !== 0 ?
                            Object.keys(latenciesInfoRef.current).map((ip) => {
                                return (
                                    <p>{ip} <br /> <strong>ipv6: </strong> {String(latenciesInfoRef.current[ip].ipv6)}
                                        <br /><strong>latency:</strong> {latenciesInfoRef.current[ip].latency}ms
                                    </p>
                                )
                            })
                            : <p>no online peers</p>}

                        <div className="flex flex-row">
                            {ts_peersIP.map((item) => {
                                return (
                                    <div>
                                        {item.ipv4}
                                        <br />
                                        {item.ipv6}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </Card>

                {/*Tailscale Status */}
                <Card
                    className={`flex flex-col ${hoveredCard === 'tailscale' ? 'bg-opacity-100' : 'bg-white bg-opacity-5'} transition duration-200`}
                    onMouseEnter={() => setHoveredCard('tailscale')}
                    onMouseLeave={() => setHoveredCard(null)}
                >
                    <div className='flex flex-row justify-between item-center m-4 mb-0'>
                        <p className="font-medium mb-2">Tailscale Status</p>
                        <TooltipProvider>
                            <Tooltip delayDuration={50}>
                                <TooltipTrigger asChild>
                                    <Braces className="h-4 w-4" />
                                </TooltipTrigger>
                                <TooltipContent className="w-[600px] border rounded-md">
                                    <ScrollArea className="max-h-[400px]" style={{ textAlign: 'left', overflowY: 'auto', overflowX: 'auto' }}>
                                        <Button variant="ghost" onClick={() => { window.ipcBridge.copy(JSON.stringify(ts_status, null, 2)) }}>copy to clipboard</Button>
                                        <pre style={{ width: '50px', textAlign: 'left' }}>{JSON.stringify(ts_status, null, 2)}</pre>
                                        <ScrollBar orientation="vertical" />
                                    </ScrollArea>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <ScrollArea className="p-4 h-[250px] ">
                        {Object.keys(ts_status).length !== 0 ?
                            <div className="flex flex-col gap-2">
                                <div className='border-b-2 border-white border-opacity-20 pb-2'><strong>backend state: </strong>{ts_status.BackendState}</div>
                                <div className='border-b-2 border-white border-opacity-20 pb-2'><strong>self: </strong>{selfIPs.ipv4}, {selfIPs.ipv6}</div>
                                <div className='border-b-2 border-white border-opacity-20 pb-2'><strong>Current Network: </strong>{currentNetworkName}</div>
                                {ts_status.Peer && Object.keys(ts_status.Peer).map((key) => {
                                    const peer = ts_status.Peer[key]
                                    if (peer.UserID === ts_status.Self.UserID) {
                                        return (
                                            <div key={key} className='border-b-2 border-white border-opacity-20 pb-2'>
                                                <strong>host name: </strong>{peer.HostName}
                                                <br />
                                                <strong>tailscale ips: </strong>
                                                {peer.TailscaleIPs.map((ip, index) => (
                                                    <p >
                                                        {ip}
                                                    </p>
                                                ))}
                                                {peer.Relay.length !== 0 ?
                                                    <span><strong>relay: </strong>{peer.Relay}</span>
                                                    :
                                                    <span><strong>direct</strong></span>
                                                }
                                                <br />
                                                <strong>OS: </strong>{peer.OS}
                                                <br />
                                                <strong>online: </strong>{String(peer.Online)}
                                            </div>
                                        )
                                    }
                                })}
                            </div>
                            : null}
                    </ScrollArea>
                </Card>


            </div>
        </ScrollArea>
    )
}
