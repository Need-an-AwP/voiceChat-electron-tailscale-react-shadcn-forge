import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { isValidIPv4, isValidIPv6 } from '../utils/ipValidation';


const TailscaleContext = createContext()

export function TailscaleProvider({ children }) {
    const [ts_status, setts_status] = useState({})
    const [selfIPs, setSelfIPs] = useState({})
    const [currentNetworkName, setCurrentNetworkName] = useState('')
    const [ts_peersIP, setts_peersIP] = useState([])
    const [Ping_status, setPing_status] = useState({})
    const blankStreamRef = useRef(null);

    //webrtc & status listener
    useEffect(() => {
        //initialize audiocontext
        //ctx_mainRef.current = new AudioContext()
        const emptyAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        const emptyAudioSource = emptyAudioContext.createMediaStreamDestination();
        const blankStream = new MediaStream([emptyAudioSource.stream.getAudioTracks()[0]]);
        blankStreamRef.current = blankStream

        const handleStatusChannel = (d) => {
            let obj = JSON.parse(d)
            let value;
            if (obj.status) {
                value = obj.status
            } else {
                value = obj
            }

            const selfUserID = value.Self.UserID
            const loginName = value.User[value.Self.UserID].LoginName
            setCurrentNetworkName(loginName)

            setts_status(value)
            let ipv4, ipv6;
            value.Self.TailscaleIPs.map(ip => {
                if (isValidIPv4(ip)) {
                    ipv4 = ip
                } else if (isValidIPv6(ip)) {
                    ipv6 = ip
                }
            })
            setSelfIPs({ ipv4: ipv4, ipv6: ipv6 })



            let peersIPList = []
            for (let key of Object.keys(value.Peer)) {
                if (value.Peer[key].Online && value.Peer[key].UserID === selfUserID) {
                    let a = {}
                    value.Peer[key].TailscaleIPs.some(ip => {
                        if (isValidIPv4(ip)) {
                            a['ipv4'] = ip
                            return true
                        }
                        return false
                    })
                    value.Peer[key].TailscaleIPs.some(ip => {
                        if (isValidIPv6(ip)) {
                            a['ipv6'] = ip
                            return true
                        }
                        return false
                    })
                    peersIPList.push(a)
                }
            }
            setts_peersIP(peersIPList)
        }
        window.ipcBridge.receive('status_channel', handleStatusChannel);

        const handleStatusChannelPing = (d) => {
            let value = JSON.parse(d)
            for (let key in value) {
                setPing_status(prev => ({ ...prev, [value[key].IP]: value[key] }))
            }
        }
        window.ipcBridge.receive('status_channel_ping', handleStatusChannelPing);


        return () => {
            window.ipcBridge.removeListener('status_channel', handleStatusChannel);
            window.ipcBridge.removeListener('status_channel_ping', handleStatusChannelPing);
        }
    }, [])

    const value = {
        ts_status,
        selfIPs,
        currentNetworkName,
        ts_peersIP,
        Ping_status,
        blankStreamRef
    }

    return (
        <TailscaleContext.Provider value={value}>
            {children}
        </TailscaleContext.Provider>
    )
}

export function useTailscale() {
    const tailscale = useContext(TailscaleContext)
    if (!tailscale) {
        throw new Error('useTailscale must be used within a TailscaleProvider')
    }
    return tailscale;
}

