import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext';
import { useTailscale } from './TailscaleContext';


const RTCContext = createContext();


export const RTCProvider = ({ children }) => {
    const { sockets, uuids } = useSocket();
    const [selfUUID, setSelfUUID] = useState(null);
    const offerWaitingTimers = useRef({});
    const { selfIPs, blankStreamRef } = useTailscale();
    //const [rtcLocalPCs, setRtcLocalPCs] = useState({});
    const rtcLocalPCsRef = useRef({});
    const receivedStreamsRef = useRef({});
    const [connectionState, setConnectionState] = useState({});
    const rtcLocalFlagsRef = useRef({});
    const [localPCtimeouts, setLocalPCtimeouts] = useState({});
    const [pendingIceCandidates, setPendingIceCandidates] = useState({});
    const dataChannelRef = useRef({});
    const [chatChannel, setChatChannel] = useState({});
    const syncDCRef = useRef({});
    const [syncDC, setSyncDC] = useState({});
    const channelRef = useRef([]);
    const [channels, setChannels] = useState([]);
    const roomChatRef = useRef([]);
    const [roomChat, setRoomChat] = useState([]);


    const handleDataChannelMessage = ({ msg, dataChannel, chatChannel, setChannels, selfIPs }) => {
        console.log(msg.type, msg)
        switch (msg.type) {
            default:
                console.log('unknown message type:', msg)
                break
            case 'ask_4_chatChannel':
                dataChannel.send(JSON.stringify({
                    type: 'chatChannel',
                    offerIP: { ipv4: selfIPs.ipv4, ipv6: selfIPs.ipv6 },
                    data: chatChannel
                }))
                break
            case 'chatChannel':
                const ip = msg.offerIP.ipv4
                setSyncDC(prev => ({ ...prev, [ip]: msg.data }))
                break
            case 'chat_message':
                setRoomChat(prev => ([
                    ...prev,
                    { origin: msg.origin, content: msg.content, timestamp: msg.timestamp }
                ]))
                break
            case 'updateChannel':
                setChannels(prevChannels => prevChannels.map(item => {
                    if (item.channel_id === msg.data.channel_id) {
                        return {
                            ...item,
                            inChannelUsers: [
                                ...item.inChannelUsers,
                                msg.data.localUser
                            ]
                        }
                    }
                    return item
                }))
                break
            case 'updateQuitChannel':
                setChannels(prevChannels => prevChannels.map(item => {
                    if (item.channel_id === msg.data.channel_id) {
                        return {
                            ...item,
                            inChannelUsers: item.inChannelUsers.filter(user => user.user_name !== msg.data.localUser.user_name)
                        }
                    }
                    return item
                }))
                break
        }
    }


    const createLocalRTCConnection = async (ip, socket, forceCreate = false) => {
        //if (rtcLocalPCs[ip] && !forceCreate) return;
        if (rtcLocalPCsRef.current[ip] && !forceCreate) {
            return
        }

        const pc = new RTCPeerConnection()
        //setRtcLocalPCs(prev => ({ ...prev, [ip]: pc }))

        // create data channel must be before create offer
        const dataChannel = pc.createDataChannel('dataChannel', { ordered: false })
        dataChannelRef.current[ip] = dataChannel;
        dataChannel.onopen = () => {
            dataChannel.send(JSON.stringify({ type: 'ask_4_chatChannel' }))
            //syncDCRef.current[selfIPs.ipv4] = chatChannel
            setSyncDC(prev => ({ ...prev, [selfIPs.ipv4]: chatChannel }))
        }
        dataChannel.onmessage = (event) => {
            const msg = JSON.parse(event.data)

            handleDataChannelMessage({ msg, dataChannel, chatChannel, setChannels, selfIPs })

        }

        rtcLocalPCsRef.current[ip] = pc
        //setRtcLocalPCs(prev => ({ ...prev, [ip]: pc }))
        rtcLocalFlagsRef.current[ip] = true
        const blankStream = blankStreamRef.current
        blankStream.getTracks().forEach(track => pc.addTrack(track, blankStream))
        //const MicStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        //MicStream.getTracks().forEach(track => pc.addTrack(track, MicStream))
        pc.createOffer().then(offer => {
            pc.setLocalDescription(offer)
            console.log('offer sent')
            socket.emit('offer', JSON.stringify({
                type: 'offer',
                offerIP: { ipv4: selfIPs.ipv4, ipv6: selfIPs.ipv6 },
                data: offer
            }))
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

        pc.ontrack = (e) => {
            //console.log('pc ontrack', e)
            receivedStreamsRef.current[ip] = e.streams
        }

        //positively reconnect rtc
        pc.oniceconnectionstatechange = e => {
            setConnectionState(prev => ({ ...prev, [ip]: pc.iceConnectionState }))

            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                clearTimeout(localPCtimeouts[ip]);
            } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                console.log('pc connection state:', pc.iceConnectionState, 'reconnecting...')
                pc.close();

                delete rtcLocalPCsRef.current[ip]
                delete rtcLocalFlagsRef.current[ip]
                //setRtcLocalPCs(prev => {
                //    const newState = { ...prev }
                //    delete newState[ip]
                //    return newState
                //})
                createLocalRTCConnection(ip, socket);
            }
        }

        // Add connection timeout
        const timeoutPC = setTimeout(() => {
            if (socket.connected) {
                if (pc.iceConnectionState === 'new') {
                    console.log(`Connection timeout for ${ip}, attempting to reconnect...`);
                    pc.onicecandidate = null;
                    pc.oniceconnectionstatechange = null;
                    pc.close();
                    delete rtcLocalPCsRef.current[ip]
                    delete rtcLocalFlagsRef.current[ip]
                    //setRtcLocalPCs(prev => {
                    //    const newState = { ...prev }
                    //    delete newState[ip]
                    //    return newState
                    //})
                    createLocalRTCConnection(ip, socket);
                } else if (pc.iceConnectionState === 'checking') {  //restart ice and create a new offer

                    pc.restartIce()
                    pc.createOffer({ iceRestart: true })
                        .then(offer => {
                            pc.setLocalDescription(offer);
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
        }, 5000);
        setLocalPCtimeouts(prev => ({ ...prev, [ip]: timeoutPC }))


        //answer socket handler
        socket.on('answer', async (msg) => {
            const { type, offerIP, data } = JSON.parse(msg)
            //console.log('received answer', msg)
            if (pc.signalingState !== "stable" && pc.signalingState !== "closed") {
                await pc.setRemoteDescription(data)
            }
        })
    }

    useEffect(() => {
        Object.entries(uuids).forEach(([ip, uuid]) => {
            const socket = sockets[ip]
            if (!socket) return

            if (Number(selfUUID) < Number(uuid)) {
                console.log(`create offer and send to ${ip}`)
                createLocalRTCConnection(ip, socket)
            } else {
                if (!offerWaitingTimers.current[ip]) {
                    offerWaitingTimers.current[ip] = setInterval(() => {
                        if ((socket.connected && !rtcLocalPCsRef.current[ip]) || 
                        //if ((socket.connected && !rtcLocalPCs[ip]) ||
                            (rtcLocalPCsRef.current[ip] && rtcLocalPCsRef.current[ip].iceConnectionState !== 'connected')) {
                            console.log('request offer proactively')
                            socket.emit('requestOffer', JSON.stringify({ receiverIP: { ipv4: selfIPs.ipv4, ipv6: selfIPs.ipv6 } }))
                        }
                    }, 10000);
                }
            }
        })
    }, [uuids, selfUUID])

    //create offers depend on uuid
    useEffect(() => {
        const handleSelfUUID = (self_uuid) => {
            setSelfUUID(self_uuid)
        }
        window.ipcBridge.receive('self_uuid', handleSelfUUID);

        const handleOffer = async (msg) => {
            const r_pc = new RTCPeerConnection()

            //set listener before creating answer
            r_pc.ontrack = (e) => { 
                //console.log('r_pc ontrack', e)
                receivedStreamsRef.current[msg.offerIP.ipv4] = e.streams
            }
            
            r_pc.oniceconnectionstatechange = () => {
                setConnectionState(prev => ({ ...prev, [msg.offerIP.ipv4]: r_pc.iceConnectionState }))
                
                if (r_pc.iceConnectionState === 'disconnected' || r_pc.iceConnectionState === 'failed') {
                    delete rtcLocalPCsRef.current[msg.offerIP.ipv4]
                    //setRtcLocalPCs(prev => {
                    //    const newState = { ...prev }
                    //    delete newState[msg.offerIP.ipv4]
                    //    return newState
                    //})
                    //if (rc) {
                    //    rc.close();
                    //}
                    r_pc.close();
                }
            }

            r_pc.ondatachannel = (event) => {
                const dataChannel = event.channel
                dataChannelRef.current[msg.offerIP.ipv4] = dataChannel
                dataChannel.onopen = () => {
                    dataChannel.send(JSON.stringify({ type: 'ask_4_chatChannel' }))
                    //syncDCRef.current[selfIPs.ipv4] = chatChannel
                    setSyncDC(prev => ({ ...prev, [selfIPs.ipv4]: chatChannel }))
                }
                dataChannel.onmessage = (event) => {
                    const msg = JSON.parse(event.data)

                    handleDataChannelMessage({ msg, dataChannel, chatChannel, setChannels, selfIPs })

                }
            }

            await r_pc.setRemoteDescription(msg.data)
            if (blankStreamRef.current) {
                const blankStream = blankStreamRef.current
                blankStream.getTracks().forEach(track => r_pc.addTrack(track, blankStream))
                const answer = await r_pc.createAnswer()
                await r_pc.setLocalDescription(answer)
                msg['data'] = answer
                msg['type'] = 'answer'
                console.log('received offer, send answer')
                window.ipcBridge.send('replyOffer', msg)

                rtcLocalPCsRef.current[msg.offerIP.ipv4] = r_pc
                //setRtcLocalPCs(prev => ({ ...prev, [msg.offerIP.ipv4]: r_pc }))
            }

            

        }
        window.ipcBridge.receive('offer', handleOffer);

        const handleIceCandidate = async (msg) => {
            console.log('ice received');
            const offerIp = msg.offerIP.ipv4;
            const candidate = msg.data;

            setPendingIceCandidates(prev => ({
                ...prev,
                [offerIp]: prev[offerIp] ? [...prev[offerIp], candidate] : [candidate]
            }));
        }
        window.ipcBridge.receive('icecandidate', handleIceCandidate);

        const handleRequestOffer = async (msg) => {
            const { ipv4, ipv6 } = msg.receiverIP
            //create a new offer from existing pc
            const pc = rtcLocalPCsRef.current[ipv4];
            //const pc = rtcLocalPCs[ipv4];
            if (pc && pc.iceConnectionState !== "connected" && sockets[ipv4]) {
                try {
                    const offer = await pc.createOffer({ iceRestart: true });
                    await pc.setLocalDescription(offer);
                    console.log('New offer created for existing connection');
                    sockets[ipv4].emit('offer', JSON.stringify({
                        type: 'offer',
                        offerIP: { ipv4: selfIPs.ipv4, ipv6: selfIPs.ipv6 },
                        data: offer
                    }));
                } catch (error) {
                    console.error('Error recreating offer:', error);
                }
            } else {
                console.log('Cannot recreate offer from existing pc, try to create a new pc');
                createLocalRTCConnection(ipv4, sockets[ipv4], true)
            }
        }
        window.ipcBridge.receive('requestOffer', handleRequestOffer);

        return () => {
            window.ipcBridge.removeListener('self_uuid', handleSelfUUID);
            window.ipcBridge.removeListener('offer', handleOffer);
            window.ipcBridge.removeListener('icecandidate', handleIceCandidate);
            window.ipcBridge.removeListener('requestOffer', handleRequestOffer);
        }
    }, [sockets, chatChannel])

    // ice candidate add interval loop
    useEffect(() => {
        Object.keys(rtcLocalPCsRef.current).forEach((key) => {
        //Object.keys(rtcLocalPCs).forEach((key) => {
            const r_pc = rtcLocalPCsRef.current[key];
            //const r_pc = rtcLocalPCs[key];
            const candidates = pendingIceCandidates[key];

            if (r_pc && candidates && candidates.length > 0) {
                console.log('add ice candidates')
                candidates.forEach(candidate => {
                    r_pc.addIceCandidate(candidate.candidate ? candidate : null)
                        .catch(e => console.error("Failed to add ICE candidate:", e));
                });

                // Clear pending candidates after adding them
                setPendingIceCandidates(prev => {
                    const newCandidates = { ...prev };
                    delete newCandidates[key];
                    return newCandidates;
                });
            }
        });
    }, [pendingIceCandidates]);

    //calculate consensus chatChannel
    useEffect(() => {
        if (Object.keys(syncDC).length > 1) {
            const timeStampKeys = {}
            for (let key in syncDC) {
                let latestTimeStamp = 0
                const chat = syncDC[key].chat
                const channels = syncDC[key].channels
                if (chat && channels) {
                    if (chat.length > 0 || channels.length > 0) {
                        chat.map(item => {
                            if (item.timestamp > latestTimeStamp) { latestTimeStamp = item.timestamp }
                        })
                        channels.map(item => {
                            if (item.create_time > latestTimeStamp) { latestTimeStamp = item.create_time }
                        })
                    }
                }
                timeStampKeys[key] = latestTimeStamp
            }

            let consensusTimeStamp = 0
            for (let key in timeStampKeys) {
                if (timeStampKeys[key] > consensusTimeStamp) {
                    consensusTimeStamp = timeStampKeys[key]
                    //channelRef.current = syncDC[key].channels
                    setChannels(syncDC[key].channels)
                    //roomChatRef.current = syncDC[key].chat
                    setRoomChat(syncDC[key].chat)
                }
            }
        } else if (Object.keys(syncDC).length === 1) {
            const key = Object.keys(syncDC)[0]
            if (syncDC[key].channels && syncDC[key].chat) {
                //channelRef.current = syncDC[key].channels
                setChannels(syncDC[key].channels)
                //roomChatRef.current = syncDC[key].chat
                setRoomChat(syncDC[key].chat)
            }
        }
    }, [syncDC])

    const value = {
        rtcLocalPCs: rtcLocalPCsRef.current,
        //rtcLocalPCs,
        receivedStreams: receivedStreamsRef.current,
        connectionState,
        rtcLocalFlags: rtcLocalFlagsRef.current,
        dataChannels: dataChannelRef.current,
        setChatChannel,
        channels,
        setChannels,
        roomChat,
        setRoomChat,
    }

    return (
        <RTCContext.Provider value={value}>
            {children}
        </RTCContext.Provider>
    )
}

export const useRTC = () => {
    const rtc = useContext(RTCContext);
    if (!rtc) {
        throw new Error('useRTC must be used within a LocalRTCProvider');
    }
    return rtc;
}

