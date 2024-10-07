import { useState, useEffect, useRef, createRef } from 'react';
import './App.css'
import { TailscaleProvider } from './context/TailscaleContext'
import { SocketProvider } from './context/SocketContext'
import { RTCProvider } from './context/RTCContext'
import { AudioProvider } from './context/AudioContext'
import MainLayout from './MainLayout'


function App() {

    return (
        <TailscaleProvider>
            <SocketProvider>
                <RTCProvider>
                    <AudioProvider>

                        <MainLayout />

                    </AudioProvider>
                </RTCProvider>
            </SocketProvider>
        </TailscaleProvider>
    )
}

export default App
