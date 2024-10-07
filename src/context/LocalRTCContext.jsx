import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useTailscale } from './TailscaleContext';


const LocalRTCContext = createContext();

export const LocalRTCProvider = ({ children }) => {
    const { selfIPs, blankStreamRef } = useTailscale();
    const { sockets } = useSocket();
    const [rtcLocalPCs, setRtcLocalPCs] = useState({});
    const [localDataChannels, setLocalDataChannels] = useState({});
    const [chatChannel, setChatChannel] = useState({});
    const [activeRTCconnectionNum, setActiveRTCconnectionNum] = useState(0);
    const [localPCtimeouts, setLocalPCtimeouts] = useState({});


    useEffect(() => {
        if (Object.keys(sockets).length === 0) return;

        const createLocalRTCConnection = (ip, socket) => {
            if (rtcLocalPCs[ip]) return;
            const pc = new RTCPeerConnection()

            const blankStream = blankStreamRef.current
            blankStream.getTracks().forEach(track => pc.addTrack(track, blankStream))
            pc.createOffer().then(offer => {
                pc.setLocalDescription(offer)
                console.log('offer sent')
                socket.emit('offer', JSON.stringify({
                    type: 'offer',
                    offerIP: { ipv4: selfIPs.ipv4, ipv6: selfIPs.ipv6 },
                    data: offer
                }))
                setRtcLocalPCs(prev => ({ ...prev, [ip]: pc }))
            })

            pc.onicecandidate = e => {
                if (e.candidate && socket.connected) {
                    console.log('ice sent')
                    socket.emit('icecandidate', JSON.stringify({
                        type: 'icecandidate',
                        offerIP: { ipv4: selfIPs.ipv4, ipv6: selfIPs.ipv6 },
                        data: e.candidate
                    }))
                }
            }

            //positively reconnect rtc
            pc.oniceconnectionstatechange = () => {
                if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                    clearTimeout(localPCtimeouts[ip]);
                    setActiveRTCconnectionNum(prev => prev + 1)
                } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                    //console.log('RTC connection disconnected, attempting to reconnect...');
                    pc.close();

                    setRtcLocalPCs(prev => {
                        const newState = { ...prev }
                        delete newState[ip]
                        return newState
                    })
                    setActiveRTCconnectionNum(prev => Math.max(0, prev - 1))
                    createLocalRTCConnection(ip, socket);
                }
            }

            // Add connection timeout
            const timeoutPC = setTimeout(() => {
                if (socket.connected) {
                    if (pc.iceConnectionState === 'new') {
                        console.log(`Connection timeout for ${ip}, attempting to reconnect...`);
                        pc.close();
                        setRtcLocalPCs(prev => {
                            const newState = { ...prev }
                            delete newState[ip]
                            return newState
                        })
                        createLocalRTCConnection(ip, socket);
                    } else if (pc.iceConnectionState === 'checking') {  //restart ice and create a new offer

                        pc.restartIce()
                        pc.createOffer({ iceRestart: true })
                            .then(offer => {
                                pc.setLocalDescription(offer);
                                console.log('icerestart offer sent')
                                socket.emit('offer', JSON.stringify({
                                    type: 'offer',
                                    offerIP: { ipv4: selfIPs.ipv4, ipv6: selfIPs.ipv6 },
                                    data: offer
                                }));
                                console.log('restart ice & sent new offer')
                            })
                            .catch(err => console.error('Error during ICE restart:', err));

                    }
                }
            }, 15000);
            setLocalPCtimeouts(prev => ({ ...prev, [ip]: timeoutPC }))

            const msgDataChannel = pc.createDataChannel('msgChannel')
            setInterval(() => {
                console.log('msg channel status:', msgDataChannel.readyState,
                    'pc status:', pc.iceConnectionState)
            }, 1000);

            msgDataChannel.onopen = () => {
                console.log('msg channel state:', msgDataChannel.readyState)
            }
            const syncDataChannel = pc.createDataChannel('syncChannel')
            syncDataChannel.onopen = () => {
                console.log('sync channel state:', syncDataChannel.readyState)
                syncDataChannel.send(JSON.stringify({
                    type: 'syncChatChannelInfo',
                    origin: { ipv4: selfIPs.ipv4, ipv6: selfIPs.ipv6 },
                    data: chatChannel
                }))
            }
            setLocalDataChannels(prev => ({ ...prev, [ip]: { msg: msgDataChannel, sync: syncDataChannel } }))

        }

        Object.entries(sockets).forEach(([ip, socket]) => {
            createLocalRTCConnection(ip, socket)
        })
    }, [sockets])

    const value = {
        rtcLocalPCs,
        setChatChannel,
        activeRTCconnectionNum
    }

    return (
        <LocalRTCContext.Provider value={value}>
            {children}
        </LocalRTCContext.Provider>
    )
}


export const useLocalRTC = () => {
    const rtc = useContext(LocalRTCContext);
    if (!rtc) {
        throw new Error('useLocalRTC must be used within a SocketProvider');
    }
    return rtc;
}

