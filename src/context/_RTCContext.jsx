import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useLocalRTC } from './LocalRTCContext';
import { useTailscale } from './TailscaleContext';

const RTCContext = createContext();

export const RTCProvider = ({ children }) => {
    const { blankStreamRef } = useTailscale();
    const { sockets } = useSocket();
    const { rtcLocalPCs } = useLocalRTC();
    const answerPCtimeRef = useRef({});

    const [rtcRemotePCs, setRtcRemotePCs] = useState({});
    const [pendingIceCandidates, setPendingIceCandidates] = useState({});

    // offer and ice handler, answer socket handler
    useEffect(() => {
        if (!sockets || Object.keys(sockets).length === 0) return;

        Object.entries(sockets).forEach(([ip, socket]) => {
            socket.on('answer', async (msg) => {
                console.log('received answer')
                const { type, offerIP, data } = JSON.parse(msg)
                if (answerPCtimeRef.current[offerIP.ipv4] === null) {
                    const lastProcessedTime = answerPCtimeRef.current[offerIP.ipv4]
                    if (Date.now() - lastProcessedTime < 1000) {
                        console.log('Ignoring duplicate answer');
                        return;
                    }
                }

                if (rtcLocalPCs[ip]) {
                    const pc = rtcLocalPCs[ip]
                    if (pc.signalingState !== "stable" && pc.signalingState !== "closed") {
                        await pc.setRemoteDescription(data);
                        answerPCtimeRef.current[offerIP.ipv4] = Date.now()
                    }
                }
            })
        })

        const handleOffer = async (msg) => {
            const r_pc = new RTCPeerConnection()
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

                setRtcRemotePCs(prev => ({ ...prev, [msg.offerIP.ipv4]: r_pc }))
            }

            r_pc.oniceconnectionstatechange = () => {
                if (r_pc.iceConnectionState === 'disconnected' || r_pc.iceConnectionState === 'failed') {
                    setRtcRemotePCs(prev => {
                        const newState = { ...prev }
                        delete newState[msg.offerIP.ipv4]
                        return newState
                    })
                    //if (rc) {
                    //    rc.close();
                    //}
                    r_pc.close();
                }
            };

            r_pc.ontrack = (e) => { };

            r_pc.ondatachannel = (e) => {
                const dataChannel = e.channel
                dataChannel.onopen = () => {
                    console.log('remote data channel state:', dataChannel.readyState)
                }
                dataChannel.onmessage = (e) => {
                    console.log('remote data channel message:', e.data)
                    console.log('received message on ', dataChannel.label)
                }
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

    }, [sockets, rtcLocalPCs]);

    // ice candidate add interval loop
    useEffect(() => {
        Object.keys(rtcRemotePCs).forEach((key) => {
            const r_pc = rtcRemotePCs[key];
            const candidates = pendingIceCandidates[key];

            if (r_pc && candidates && candidates.length > 0) {
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

    const value = {
        rtcRemotePCs
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

