import { useEffect, useState, useMemo, useRef } from "react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
    ContextMenu,
    ContextMenuCheckboxItem,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuRadioGroup,
    ContextMenuRadioItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Airplay } from 'lucide-react';
import { Slider } from "@/components/ui/slider"
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Volume2 } from 'lucide-react';

import HanupMotionIcon from './HanupMotionIcon';
import AudioLevelMeter from './AudioLevelMeter';
import { useRTC } from '../context/RTCContext';
import { useAudio } from '../context/AudioContext';
import { useInVoiceChannel } from '../context/InVoiceChannelContext';
import { useTailscale } from '../context/TailscaleContext';



const ChannelList = ({ userConfig, selfIPs }) => {
    const { rtcLocalPCs, receivedStreams, connectionState, channels, setChannels, dataChannels } = useRTC()
    const { inVoiceChannel, setInVoiceChannel } = useInVoiceChannel()
    const { blankStreamRef } = useTailscale()

    const quitChannel = useRef({})
    const [enterChannelDisabled, setEnterChannelDisabled] = useState(false);
    const { ctx_main, finalStream, nodesRef } = useAudio()
    const audioElementsRef = useRef({})
    const trackReplacedPCsRef = useRef({})
    const streamsRef = useRef({})


    useEffect(() => {
        //quit channel
        if (Object.keys(inVoiceChannel).length === 0) {
            setChannels(prevChannels => prevChannels.map(item => {
                if (item.channel_id === quitChannel.current.channel_id) {
                    item.inChannelUsers = item.inChannelUsers.filter(user => user.user_id !== userConfig.user_id)
                    return item
                }
                return item
            }))

            Object.entries(dataChannels).forEach(([ip, datachannel]) => {
                if (datachannel.readyState === 'open') {
                    datachannel.send(JSON.stringify({
                        type: 'updateQuitChannel',
                        data: quitChannel.current
                    }))
                }
            })

        } else if (inVoiceChannel.localUser) {
            //enter channel
            setChannels(prevChannels => prevChannels.map(item => {
                if (item.channel_id === inVoiceChannel.channel_id) {
                    return {
                        ...item,
                        inChannelUsers: [
                            ...item.inChannelUsers,
                            inVoiceChannel.localUser
                        ]
                    };
                }
                return item;
            }))

            Object.entries(dataChannels).forEach(([ip, datachannel]) => {
                if (datachannel.readyState === 'open') {
                    datachannel.send(JSON.stringify({
                        type: 'updateChannel',
                        data: inVoiceChannel
                    }))
                }
            })
        }

    }, [inVoiceChannel, setChannels, dataChannels])

    useEffect(() => {
        if (inVoiceChannel.localUser) {
            const currentChannel = channels.find(item => item.channel_id === inVoiceChannel.channel_id)
            if (currentChannel.inChannelUsers.length !== 1) {
                const remoteUsers = currentChannel.inChannelUsers.filter(user => user.user_id !== userConfig.user_id)
                remoteUsers.map(user => {
                    const ip = user.ip.ipv4
                    const pc = rtcLocalPCs[ip]
                    if (!pc) {
                        console.log('no corresponding pc found')
                        return
                    }
                    trackReplacedPCsRef.current[ip] = pc

                    const senders = pc.getSenders()
                    senders.forEach(sender => {
                        if (sender.track && sender.track.kind === 'audio') {
                            finalStream.getTracks().forEach(track => sender.replaceTrack(track))
                        }
                    });
                    console.log('replaced audio track for ', ip)

                    //e.streams.forEach(stream => { })
                    if (receivedStreams.length === 0) { return }
                    const [stream] = receivedStreams[ip];
                    streamsRef.current[ip] = stream

                    if (!audioElementsRef.current[ip]) {
                        const audioEl = new Audio()
                        audioElementsRef.current[ip] = audioEl
                    }
                    audioElementsRef.current[ip].srcObject = stream

                })
            }
        } else {
            Object.entries(trackReplacedPCsRef.current).forEach(([ip, pc]) => {
                const senders = pc.getSenders()
                senders.forEach(sender => {
                    if (sender.track && sender.track.kind === 'audio') {
                        blankStreamRef.current.getTracks().forEach(track => sender.replaceTrack(track))
                    }
                });
            })
        }
    }, [channels])

    useEffect(() => {
        //console.log(connectionState)
        if (Object.keys(connectionState).length === 0) {
            setEnterChannelDisabled(true);
        } else {
            const isAnyConnected = Object.values(connectionState).some(
                state => state === 'connected'
            );
            setEnterChannelDisabled(!isAnyConnected);
        }
    }, [connectionState])


    const handleDoubleClick = (item) => {
        if (Object.keys(inVoiceChannel).length !== 0) return
        console.log(item)
        const localUser = {
            user_name: userConfig.user_name,
            user_id: userConfig.user_id,
            ip: { ipv4: selfIPs.ipv4, ipv6: selfIPs.ipv6 },
            local_audio_state: { inputMuted: false, outputMuted: false },
            remote_audio_state: { inputMuted: false, outputMuted: false },
            volume: 1,
        };
        setInVoiceChannel({
            ...item,
            localUser: localUser
        });
    }

    const updateUserProperty = (userIndex, path, value) => {
        setInVoiceChannel(prevState => {
            const newUsers = [...prevState.inChannelUsers];
            const newUser = { ...newUsers[userIndex] };

            // 使用递归函数来更新嵌套属性
            const updateNestedProperty = (obj, pathArray, val) => {
                if (pathArray.length === 1) {
                    obj[pathArray[0]] = val;
                } else {
                    const key = pathArray.shift();
                    obj[key] = { ...obj[key] };
                    updateNestedProperty(obj[key], pathArray, val);
                }
            };

            updateNestedProperty(newUser, path.split('.'), value);
            newUsers[userIndex] = newUser;

            return { ...prevState, inChannelUsers: newUsers };
        });
    };

    const handleHangup = () => {
        quitChannel.current = inVoiceChannel
        setInVoiceChannel({})
    }

    const channelElements = useMemo(() => {
        return
    }, [channels, inVoiceChannel, userConfig.user_name])


    return (
        <>
            <ScrollArea className="flex-grow">
                <div className="p-1 pt-0 gap-2">
                    {channels.length !== 0 && (
                        channels.map(item =>
                            <div className="pr-2 pl-2">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start border-0"
                                    disabled={enterChannelDisabled}
                                    onDoubleClick={() => handleDoubleClick(item)}
                                >
                                    <Volume2 className="mr-2 h-4 w-4" /> {item.channel_name}
                                </Button>
                                <div className="pl-10 flex flex-col">

                                    {item.inChannelUsers.length > 0 && item.inChannelUsers.map((user, index) => {
                                        if (user.user_name === userConfig.user_name) {
                                            return (
                                                // local user
                                                <div key={index} className="my-1 p-1 pr-0 flex flex-row gap-2 items-center rounded-md hover:bg-secondary">
                                                    <Avatar className="h-8 w-8 mr-2">
                                                        <AvatarImage src="/user-avatar.jpg" alt="User" />
                                                        <AvatarFallback className="text-md justify-center items-center bg-neutral-500">
                                                            {user.user_name.slice(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="text-sm font-medium text-white">{user.user_name}</div>
                                                </div>
                                            )
                                        } else {
                                            return (
                                                //remote user
                                                <ContextMenu>
                                                    <ContextMenuTrigger>
                                                        <AudioLevelMeter
                                                            audioStream={streamsRef.current[user.ip.ipv4]}
                                                            key={index}
                                                            className="my-1 p-1 pr-0 flex flex-row gap-2 items-center rounded-md hover:bg-secondary"
                                                        >
                                                            <Avatar className="h-8 w-8 mr-2">
                                                                <AvatarImage src="/user-avatar.jpg" alt="User" />
                                                                <AvatarFallback className="text-md justify-center items-center bg-neutral-500">
                                                                    {user.user_name.slice(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="text-sm font-medium text-white">{user.user_name}</div>
                                                        </AudioLevelMeter>
                                                        
                                                        <audio
                                                            className="w-40 hidden"
                                                            ref={el => {
                                                                if (el) {
                                                                    audioElementsRef.current[user.ip.ipv4] = el
                                                                }
                                                            }}
                                                            controls
                                                            autoPlay
                                                        />
                                                    </ContextMenuTrigger>
                                                    <ContextMenuContent className="w-64">
                                                        <ContextMenuCheckboxItem
                                                            onSelect={(event) => { event.preventDefault() }}
                                                            checked={user.local_audio_state.outputMuted}
                                                            onCheckedChange={(checked) => {
                                                                updateUserProperty(index, 'volume', 0)
                                                                updateUserProperty(index, 'local_audio_state.outputMuted', checked)
                                                            }}
                                                            className={`${user.local_audio_state.outputMuted ? 'bg-red-500 focus:bg-red-500' : ''}`}
                                                        >
                                                            mute this user's output
                                                        </ContextMenuCheckboxItem >
                                                        <ContextMenuCheckboxItem
                                                            onSelect={(event) => { event.preventDefault() }}
                                                            checked={user.local_audio_state.inputMuted}
                                                            onCheckedChange={(checked) => updateUserProperty(index, 'local_audio_state.inputMuted', checked)}
                                                            className={`${user.local_audio_state.inputMuted ? 'bg-red-500 focus:bg-red-500' : ''}`}
                                                        >
                                                            mute input for this user
                                                        </ContextMenuCheckboxItem >

                                                        <ContextMenuSeparator />

                                                        <ContextMenuItem onSelect={(event) => { event.preventDefault() }}>
                                                            <Slider
                                                                min={0}
                                                                max={300}
                                                                value={[user.volume * 100]}
                                                                onValueChange={(value) => {
                                                                    updateUserProperty(index, 'volume', value[0] / 100)
                                                                    updateUserProperty(index, 'local_audio_state.outputMuted', false)
                                                                }}
                                                            />
                                                        </ContextMenuItem>

                                                    </ContextMenuContent>
                                                </ContextMenu>
                                            )
                                        }
                                    })}
                                </div>
                            </div>
                        )
                    )}
                </div>
            </ScrollArea>

            {Object.keys(inVoiceChannel).length !== 0 &&
                (
                    <div className="flex flex-col gap-2 p-1 bg-[#2d2d2d] border-b border-neutral-500 justify-between">
                        <div className="flex flex-row justify-between">
                            <div className="flex flex-row gap-2 ml-2 my-2 text-sm text-green-400">
                                {inVoiceChannel.channel_name}
                            </div>
                            <div>
                                <TooltipProvider delayDuration={50}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button size="icon" variant="ghost" onClick={() => { }}>
                                                <Airplay className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Share Screen</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider delayDuration={50}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button size="icon" variant="ghost" onClick={() => handleHangup()}>
                                                <HanupMotionIcon size={16} />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Hangup</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    </div>
                )}
        </>
    )
}


export default ChannelList
