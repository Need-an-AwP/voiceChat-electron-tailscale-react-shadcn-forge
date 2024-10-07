// /context/SocketContext.js

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { isValidIPv4 } from '../utils/ipValidation';
import { useTailscale } from './TailscaleContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { ts_peersIP: peersIPList } = useTailscale();
    const [sockets, setSockets] = useState({});
    const socketInstancesRef = useRef({});
    const latenciesInfoRef = useRef({});
    const [uuids, setUUIDs] = useState({});

    useEffect(() => {

        function createSocketConnection(ipv4, ipv6) {
            if (socketInstancesRef.current[ipv4]) return;

            const socketOptions = {
                transports: ['websocket'],
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                timeout: 5000,
            };
            const ipv4Socket = io(`http://${ipv4}:8848`, socketOptions);
            const ipv6Socket = io(`http://[${ipv6}]:8848`, socketOptions);

            socketInstancesRef.current[ipv4] = { ipv4: ipv4Socket, ipv6: ipv6Socket };

            ipv4Socket.on('connect', () => handleSocketConnect(ipv4Socket, ipv4));
            ipv4Socket.on('connect_error', () => {
                console.log(`${ipv4} socket connection error, reconnecting...`)
            })
            ipv6Socket.on('connect', () => handleSocketConnect(ipv6Socket, ipv4));
            ipv6Socket.on('connect_error', () => {
                console.log(`${ipv6} socket connection error, reconnecting...`)
            })

            function handleSocketConnect(socket, ipv4) {
                const otherSocket = socket === ipv4Socket ? ipv6Socket : ipv4Socket;
                otherSocket.disconnect();

                socket.on('disconnect', () => {
                    //delete socketsRef.current[ipv4]
                    setSockets(prev => {
                        const newSockets = { ...prev };
                        delete newSockets[ipv4];
                        return newSockets;
                    });
                    console.log(`${ipv4} socket disconnected`)
                })

                socket.on('pong', () => {
                    const latency = Date.now() - latenciesInfoRef.current[ipv4].pingTime;
                    //console.log('pong received, latency:', latency)

                    latenciesInfoRef.current[ipv4].pongTime = Date.now();
                    latenciesInfoRef.current[ipv4].latency = latency;
                })

                socket.on('uuid', (uuid) => {
                    console.log('uuid', uuid)
                    setUUIDs(prev => ({ ...prev, [ipv4]: uuid }))
                })

                //socketsRef.current[ipv4] = socket;
                setSockets(prev => ({ ...prev, [ipv4]: socket }));
            }

        }
        //console.log('peersIPList', peersIPList)
        if (peersIPList.length > 0) {
            peersIPList.map(ipObj => {
                createSocketConnection(ipObj.ipv4, ipObj.ipv6)
            })
        }

        const TIMEOUT_THRESHOLD = 5000;
        const socketPingInterval = setInterval(() => {
            Object.entries(sockets).forEach(([ip, socket]) => {
                const currentTime = Date.now();
                socket.emit('ping', JSON.stringify({ type: 'ping' }));

                if (!latenciesInfoRef.current[ip]) {
                    latenciesInfoRef.current[ip] = { ipv6: isValidIPv4(ip) ? false : true };
                }
                latenciesInfoRef.current[ip].pingTime = currentTime;
                if (latenciesInfoRef.current[ip].pongTime && currentTime - latenciesInfoRef.current[ip].pongTime > TIMEOUT_THRESHOLD) {
                    console.log(`Connection to ${ip} seems to be lost. Cleaning up.`);
                    socket.close();
                    //delete socketsRef.current[ip];
                    setSockets(prev => {
                        const newSockets = { ...prev };
                        delete newSockets[ip];
                        return newSockets;
                    });
                    delete socketInstancesRef.current[ip];
                    delete latenciesInfoRef.current[ip];
                }
                //console.log('latenciesInfoRef', latenciesInfoRef.current)
            });
            if (Object.keys(sockets).length === 0) {
                clearInterval(socketPingInterval);
                latenciesInfoRef.current = {};
            }
        }, 1000);

        return () => {
            clearInterval(socketPingInterval);
            //if (socketsRef.current) {
            //Object.values(socketsRef.current).forEach(socket => socket.close());
            //}
        };

    }, [peersIPList]);

    const value = {
        sockets,
        latenciesInfoRef,
        uuids
    }

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const sockets = useContext(SocketContext);
    if (!sockets) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return sockets;
};
