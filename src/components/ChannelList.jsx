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
import { Airplay, Mic } from 'lucide-react';
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
    const [enterChannelDisabled, setEnterChannelDisabled] = useState(false);
    const {
        ctx_main,
        finalStream,
        nodesRef,
        outputVolume,
    } = useAudio()

    const audioContextsRef = useRef({});
    const gainNodesRef = useRef({})
    const quitChannel = useRef({})
    const audioElementsRef = useRef({})
    const trackReplacedPCsRef = useRef({})
    const streamsRef = useRef({})
    const [channelUserAudioState, setChannelUserAudioState] = useState({})
    // const [remoteAudioState, setRemoteAudioState] = useState({})
    const [channelUserVolume, setChannelUserVolume] = useState({})

    // send data with datachannel when enter or quit channel
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
        const resumeAudioContext = async (ctx) => {
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
        };

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
                    if (receivedStreams.length === 0) { return }
                    const [stream] = receivedStreams[ip];


                    if (!audioContextsRef.current[ip]) {
                        audioContextsRef.current[ip] = new (window.AudioContext || window.webkitAudioContext)();
                    }
                    const ctx = audioContextsRef.current[ip];
                    resumeAudioContext(ctx)
                    console.log(stream)
                    const sourceNode = ctx.createMediaStreamSource(stream);
                    const gainNode = ctx.createGain();
                    gainNode.gain.value = 1
                    const destination = ctx.createMediaStreamDestination();
                    const analyser = ctx.createAnalyser();
                    sourceNode.connect(gainNode);
                    gainNode.connect(destination);

                    //gainNode.connect(analyser);
                    //const dataArray = new Uint8Array(analyser.frequencyBinCount);
                    //setInterval(() => {
                    //    analyser.getByteFrequencyData(dataArray);
                    //    console.log(dataArray)
                    //}, 1000);
                    //streamsRef.current[ip] = stream

                    gainNodesRef.current[ip] = gainNode

                    const silentAudio = new Audio();
                    silentAudio.srcObject = stream;//origin stream spoofing for ctx can get vaild stream
                    silentAudio.volume = 0;
                    silentAudio.play().catch(e => console.log('spoofed audio play failed:', e));

                    if (!audioElementsRef.current[ip]) {
                        const audioEl = new Audio()
                        audioElementsRef.current[ip] = audioEl
                    }
                    audioElementsRef.current[ip].srcObject = destination.stream

                    setChannelUserVolume(prev => ({ ...prev, [ip]: 1 }))
                    setChannelUserAudioState(prev => ({ ...prev, [ip]: { inputMuted: false, outputMuted: false } }))
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

    // global output volume adjustment
    useEffect(() => {
        console.log('output volume changed to', outputVolume)
        if (gainNodesRef.current) {
            Object.entries(gainNodesRef.current).forEach(([ip, gainNode]) => {
                if (channelUserAudioState[ip].outputMuted) {
                    gainNode.gain.value = 0
                } else {
                    gainNode.gain.value = outputVolume
                }
            })
        }
    }, [outputVolume])

    // judge if channels is allowed to enter
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
            // local_audio_state: { inputMuted: false, outputMuted: false },
            // remote_audio_state: { inputMuted: false, outputMuted: false },
            // volume: 1,
        };
        setInVoiceChannel({
            ...item,
            localUser: localUser
        });
        setChannelUserAudioState(prev => ({ ...prev, [selfIPs.ipv4]: { inputMuted: false, outputMuted: false } }))
        // setRemoteAudioState(prev => ({ ...prev, [selfIPs.ipv4]: { inputMuted: false, outputMuted: false } }))
        setChannelUserVolume(prev => ({ ...prev, [selfIPs.ipv4]: 1 }))
    }

    const handleHangup = () => {
        Object.entries(audioElementsRef.current).forEach(([ip, audioEl]) => {
            audioEl.pause()
            audioEl.srcObject = null
            delete audioElementsRef.current[ip]
        })
        Object.entries(audioContextsRef.current).forEach(([ip, ctx]) => {
            ctx.close().catch(err => {
                console.error(`close audio context ${ip} failed:`, err);
            });
            delete audioContextsRef.current[ip];
        });
        gainNodesRef.current = {};

        // replace audio track back to blankStream

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
                                                <AudioLevelMeter
                                                    audioStream={finalStream}
                                                    key={index}
                                                    className="my-1 p-1 pr-0 flex flex-row gap-2 items-center rounded-md hover:bg-secondary"
                                                >
                                                    <Avatar className="h-8 w-8 mr-2">
                                                        <AvatarImage src="/user-avatar.jpg" alt="User" />
                                                        <AvatarFallback className="text-md justify-center items-center bg-neutral-500">
                                                            {user.user_name.slice(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="text-sm font-medium text-blue-200">{user.user_name}</div>
                                                </AudioLevelMeter>
                                            )
                                        } else {
                                            if (channelUserAudioState[user.ip.ipv4]) {
                                                return (
                                                    //remote user
                                                    <ContextMenu>
                                                        <ContextMenuTrigger>
                                                            <AudioLevelMeter
                                                                // audioStream={streamsRef.current[user.ip.ipv4]}
                                                                audioStream={audioElementsRef.current[user.ip.ipv4] && (audioElementsRef.current[user.ip.ipv4].srcObject)}
                                                                key={index}
                                                                className={`my-1 p-1 pr-0 flex flex-row gap-2 items-center rounded-md hover:bg-secondary ${channelUserAudioState[user.ip.ipv4].outputMuted ? 'bg-red-500 bg-opacity-60' : ''}`}
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
                                                                    if (el) { audioElementsRef.current[user.ip.ipv4] = el }
                                                                }}
                                                                controls
                                                                autoPlay
                                                            />
                                                        </ContextMenuTrigger>
                                                        <ContextMenuContent className="w-64">
                                                            <ContextMenuCheckboxItem
                                                                onSelect={(event) => { event.preventDefault() }}
                                                                checked={channelUserAudioState[user.ip.ipv4].outputMuted}
                                                                onCheckedChange={(checked) => {
                                                                    setChannelUserAudioState(prev => ({ ...prev, [user.ip.ipv4]: { ...prev[user.ip.ipv4], outputMuted: checked } }))
                                                                    if (checked) {
                                                                        gainNodesRef.current[user.ip.ipv4].gain.value = 0
                                                                    }
                                                                    else {
                                                                        gainNodesRef.current[user.ip.ipv4].gain.value = 1
                                                                        if (channelUserVolume[user.ip.ipv4] < 0.05) {
                                                                            setChannelUserVolume(prev => ({ ...prev, [user.ip.ipv4]: 1 }))
                                                                        }
                                                                    }

                                                                }}
                                                                className={`${channelUserAudioState[user.ip.ipv4].outputMuted ? 'bg-red-500 focus:bg-red-500' : ''}`}
                                                            >
                                                                mute this user's output
                                                            </ContextMenuCheckboxItem >
                                                            <ContextMenuCheckboxItem
                                                                disabled={true}
                                                                onSelect={(event) => { event.preventDefault() }}
                                                                checked={channelUserAudioState[user.ip.ipv4].inputMuted}
                                                                onCheckedChange={(checked) => {
                                                                    setChannelUserAudioState(prev => ({ ...prev, [user.ip.ipv4]: { ...prev[user.ip.ipv4], inputMuted: checked } }))

                                                                }}
                                                                className={`${channelUserAudioState[user.ip.ipv4].inputMuted ? 'bg-red-500 focus:bg-red-500' : ''}`}
                                                            >
                                                                mute input for this user
                                                            </ContextMenuCheckboxItem >

                                                            <ContextMenuSeparator />

                                                            <ContextMenuItem onSelect={(event) => { event.preventDefault() }}>
                                                                <Mic className="mr-2 h-4 w-4" />
                                                                <Slider
                                                                    min={0}
                                                                    max={300}
                                                                    value={[channelUserVolume[user.ip.ipv4] * 100]}
                                                                    onValueChange={(value) => {
                                                                        gainNodesRef.current[user.ip.ipv4].gain.value = value[0] / 100
                                                                        setChannelUserVolume(prev => ({ ...prev, [user.ip.ipv4]: value[0] / 100 }))
                                                                    }}
                                                                />
                                                            </ContextMenuItem>
                                                        </ContextMenuContent>

                                                    </ContextMenu>
                                                )
                                            }
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
