import { useState, useEffect, useRef } from 'react';
import { useRTC } from './context/RTCContext';
import { useSocket } from './context/SocketContext'
import { useTailscale } from './context/TailscaleContext'
import { InVoiceChannelProvider } from './context/InVoiceChannelContext'

import { ThemeProvider } from "@/components/theme-provider"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import { BackgroundBeams } from '@/components/ui/background-beams';


import TitleBar from './components/TitleBar'
import NetworkPopover from './components/NetworkPopover'
import CreateChannelPopover from './components/CreateChannelPopover'
import RightSideBarCards from './components/RightSideBarCards'
import UserPanel from './components/UserPanel'
import ChatInputBox from './components/ChatInputBox'
import ChatDisplay from './components/ChatDisplay'
import ChannelList from './components/ChannelList'



const MainLayout = () => {
    const { setChatChannel } = useRTC()
    const { selfIPs, currentNetworkName } = useTailscale();

    const chat_channelJSONRef = useRef({})
    const chat_channelRef = useRef({})

    const [userConfig, setUserConfig] = useState({})
    const controllerUrlRef = useRef('http://1.12.226.82:8080')
    const nodeServerUrlRef = useRef('http://1.12.226.82:3000')

    const [isNetworkPopoverOpen, setIsNetworkPopoverOpen] = useState(false)
    const [isSettingPopoverOpen, setIsSettingPopoverOpen] = useState(false)
    const [isChannelPopoverOpen, setIsChannelPopoverOpen] = useState(false)
    const [isAudioCapturePopoverOpen, setIsAudioCapturePopoverOpen] = useState(false)
    const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);


    //json data listener
    useEffect(() => {
        async function setupListeners() {
            const handleChatChannels = (d) => {
                chat_channelJSONRef.current = d
                if (currentNetworkName && currentNetworkName.trim() !== '') {
                    if (Object.keys(d[currentNetworkName])) {
                        chat_channelRef.current = d[currentNetworkName]
                        //syncDCRef.current = { ...syncDCRef.current, [selfIPv4]: d[currentNetworkName] }
                    } else {
                        chat_channelJSONRef.current = { ...d, [currentNetworkName]: { channels: [], chat: [] } }
                        chat_channelRef.current = { channels: [], chat: [] }
                        //syncDCRef.current = { ...syncDCRef.current, [selfIPv4]: { channels: [], chat: [] } }
                    }
                    setChatChannel(chat_channelRef.current)
                }
                console.log('received json from backend and set')
            }
            window.ipcBridge.receive('chat_channel', handleChatChannels);

            const handleConfig = (d) => {
                if (d.nwList) {
                    setUserConfig(d)
                    controllerUrlRef.current = d.controllerUrl
                    nodeServerUrlRef.current = d.nodeServerUrl
                }
            }
            window.ipcBridge.receive('config', handleConfig);

            //save chat history to local storage when app close
            const handleBeforeUnload = () => {

            }
            window.addEventListener('beforeunload', handleBeforeUnload);

            return () => {
                window.ipcBridge.removeListener('chat_channel', handleChatChannels);
                window.ipcBridge.removeListener('config', handleConfig);
                window.removeEventListener('beforeunload', handleBeforeUnload);
            }
        }

        setupListeners()
            .then(() => {
                //request json file when all listeners are ready
                window.ipcBridge.send('requestJSON');
            })

    }, [currentNetworkName])



    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <div className="flex flex-col h-screen">
                <TitleBar/>
                <BackgroundBeams className='pointer-events-none' />

                <div className="flex-grow h-[calc(100vh-32px)] w-screen">

                    {/* Overlay */}
                    {(isNetworkPopoverOpen || isSettingPopoverOpen || isChannelPopoverOpen || isAudioCapturePopoverOpen || isUserPopoverOpen) && (
                        <div
                            className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-40"
                            onClick={() => {
                                setIsNetworkPopoverOpen(false)
                                setIsSettingPopoverOpen(false)
                                setIsChannelPopoverOpen(false)
                                setIsAudioCapturePopoverOpen(false)
                                setIsUserPopoverOpen(false)
                            }}
                        />
                    )}

                    <ResizablePanelGroup direction="horizontal">
                        {/* Left Sidebar - Channels and Controls */}
                        <ResizablePanel defaultSize={20}>
                            <div className="flex flex-col h-full justify-start">
                                <NetworkPopover
                                    userConfig={userConfig}
                                    nodeServerUrlRef={nodeServerUrlRef}
                                    currentNetworkName={currentNetworkName}
                                    selfIPs={selfIPs}
                                    isNetworkPopoverOpen={isNetworkPopoverOpen}
                                    setIsNetworkPopoverOpen={setIsNetworkPopoverOpen}
                                />

                                <Separator className="w-full" />

                                <CreateChannelPopover
                                    isChannelPopoverOpen={isChannelPopoverOpen}
                                    setIsChannelPopoverOpen={setIsChannelPopoverOpen}
                                />
                                <InVoiceChannelProvider>
                                    <ChannelList
                                        userConfig={userConfig}
                                        selfIPs={selfIPs}
                                    />

                                    <div className="pt-0 mt-auto bg-[#2d2d2d]">
                                        <UserPanel
                                            userConfig={userConfig}
                                            setUserConfig={setUserConfig}
                                            isAudioCapturePopoverOpen={isAudioCapturePopoverOpen}
                                            setIsAudioCapturePopoverOpen={setIsAudioCapturePopoverOpen}
                                            isSettingPopoverOpen={isSettingPopoverOpen}
                                            setIsSettingPopoverOpen={setIsSettingPopoverOpen}
                                        />
                                    </div>
                                </InVoiceChannelProvider>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle className="w-[2px]" withHandle={true} showGripIcon={false} />
                        {/* Main Content Area */}
                        <ResizablePanel className='z-10'>
                            {/* Main Content Area */}
                            <div className=" h-full flex-1 flex flex-col bg-[#121212] bg-opacity-50 backdrop-blur-sm">
                                <ChatDisplay selfIPs={selfIPs} />

                                <ChatInputBox selfIPs={selfIPs} />

                            </div>
                        </ResizablePanel>

                        <ResizableHandle className="w-[2px]" withHandle={true} showGripIcon={false} />
                        {/* Right Sidebar - System Info */}
                        <ResizablePanel defaultSize={25} >

                            <RightSideBarCards />

                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </div>
        </ThemeProvider>
    );
};

export default MainLayout;