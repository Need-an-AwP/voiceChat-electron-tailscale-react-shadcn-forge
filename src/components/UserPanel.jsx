import { useLayoutEffect, useEffect, useState, useRef } from 'react'
import { useAudio } from '../context/AudioContext'
import { Mic, MicOff, Headphones, HeadphoneOff, Music, Settings, Info } from 'lucide-react'

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import SwitchButton from './switch_Admin12121/switch'
import AudioVisualizer from '../utils/AudioLevelVisualizer'
import EditProfileDialog from './EditProfileDialog'


const UserPanel = ({
    userConfig,
    setUserConfig,
    isAudioCapturePopoverOpen,
    setIsAudioCapturePopoverOpen,
    isSettingPopoverOpen,
    setIsSettingPopoverOpen
}) => {
    const {
        finalStream,
        addonStream,
        inputDevices,
        outputDevices,
        selectedInput,
        selectedOutput,
        setSelectedInput,
        setSelectedOutput,
        nodesRef,
        audioProcesses,
        captureProcess,
        setCaptureProcess,
        bufferLengthRef,
        intervalRef,
        toggleNoiseReduction
    } = useAudio()
    const [isMicMuted, setIsMicMuted] = useState(false)
    const [isHeadphoneMuted, setIsHeadphoneMuted] = useState(false)
    const [inputVolume, setInputVolume] = useState(1);
    const [outputVolume, setOutputVolume] = useState(1);
    const [testVolume, setTestVolume] = useState(false);
    const [addonGain, setAddonGain] = useState(1);

    const localAudioCanvasRef = useRef(null);
    const localAudioRef = useRef(null);

    const [isNoiseReductionEnabled, setIsNoiseReductionEnabled] = useState(true);

    //output selector onchange
    useEffect(() => {
        if (localAudioRef.current) {
            try {
                localAudioRef.current.setSinkId(selectedOutput)
            }
            catch (error) {
                console.error('Error setting sink ID:', error);
            }
        }
    }, [selectedOutput])

    //final stream connect to audio element
    useLayoutEffect(() => {
        if (isSettingPopoverOpen) {
            const timeoutId = setTimeout(() => {
                //console.log(finalStream, localAudioRef.current, localAudioCanvasRef.current);
                if (finalStream && localAudioRef.current && !localAudioRef.current.srcObject) {
                    localAudioRef.current.srcObject = finalStream;
                }
                if (finalStream && localAudioCanvasRef.current) {
                    const visualizer = new AudioVisualizer(finalStream, localAudioCanvasRef.current, 128);
                    visualizer.start();
                }
            }, 0);

            return () => clearTimeout(timeoutId);
        }
    }, [isSettingPopoverOpen, finalStream])

    const addonAudioCanvasRef = useRef(null);

    //addon stream connect to canvas
    useLayoutEffect(() => {
        if (isAudioCapturePopoverOpen) {
            const timeoutId = setTimeout(() => {
                if (addonAudioCanvasRef.current) {
                    const visualizer = new AudioVisualizer(addonStream, addonAudioCanvasRef.current, 64);
                    visualizer.start();
                }
            }, 0);

            return () => clearTimeout(timeoutId);
        }
    }, [isAudioCapturePopoverOpen, addonStream, captureProcess])

    const handleAddonGainChange = (value) => {
        setAddonGain(value);
        if (nodesRef.current.addonGainNode) {
            nodesRef.current.addonGainNode.gain.value = value;
        }
    };

    return (
        <div className='flex flex-col p-2'>
            <EditProfileDialog userConfig={userConfig} setUserConfig={setUserConfig} />

            <div className="flex justify-between pt-2">
                {/*micphone setting tooltip*/}
                <TooltipProvider>
                    <Tooltip delayDuration={50}>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost"
                                onClick={() => {
                                    if (isMicMuted) {
                                        setInputVolume(0.5)
                                    } else {
                                        setInputVolume(0)
                                    }
                                    setIsMicMuted(!isMicMuted);
                                }}>
                                {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="w-10 h-[150px]">
                            <Slider
                                min={0}
                                max={500}
                                orientation='vertical'
                                className="w-full h-full bg-secondary rounded-full"
                                value={[inputVolume * 100]}
                                onValueChange={(value) => { setInputVolume(value[0] / 100) }}
                            />
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/*headphone setting tooltip*/}
                <TooltipProvider>
                    <Tooltip delayDuration={50}>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost"
                                onClick={() => {
                                    if (isHeadphoneMuted) {
                                        setOutputVolume(0.5)
                                    } else {
                                        setOutputVolume(0)
                                    }
                                    setIsHeadphoneMuted(!isHeadphoneMuted)
                                }}>
                                {isHeadphoneMuted ? <HeadphoneOff className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="w-10 h-[150px]">
                            <Slider
                                min={0}
                                max={500}
                                orientation='vertical'
                                className="w-full h-full bg-secondary rounded-full"
                                value={[outputVolume * 100]}
                                onValueChange={(value) => { setOutputVolume(value[0] / 100) }}
                            />
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/*audio capture setting popover*/}
                <Popover open={isAudioCapturePopoverOpen} onOpenChange={setIsAudioCapturePopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button size="icon" variant="ghost" className={isAudioCapturePopoverOpen ? 'z-50' : null} disabled={audioProcesses === null}>
                            <Music className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="z-50">
                        <div className='flex flex-col gap-2'>
                            <p className='text-md font-bold'>Select an Input Process</p>
                            <p className='text-sm text-muted-foreground mb-2'>process which is playing audio can be captured and added into stream</p>
                            <div className='flex flex-row gap-3'>
                                <Select
                                    value={captureProcess}
                                    onValueChange={(processId) => { setCaptureProcess(processId) }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="select a process" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {audioProcesses.map(item => <SelectItem value={item.processId}>{item.processName}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Button
                                    className='bg-neutral-500'
                                    disabled={captureProcess === null}
                                    onClick={() => {
                                        setCaptureProcess(null)
                                        setIsAudioCapturePopoverOpen(false)
                                    }}
                                >
                                    reset
                                </Button>
                            </div>

                            {captureProcess !== null && (
                                <div className='flex flex-col gap-2'>
                                    <Slider min={0} max={300} value={[addonGain * 100]} onValueChange={(value) => { handleAddonGainChange(value[0] / 100) }} />
                                    <p className='text-xs text-muted-foreground'>only captured audio shows wave here</p>
                                    <canvas className='w-full' ref={addonAudioCanvasRef}></canvas>
                                </div>)}

                            <div ref={intervalRef}></div>
                            <div ref={bufferLengthRef}></div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/*setting popover */}
                <Popover
                    open={isSettingPopoverOpen}
                    onOpenChange={(res) => {
                        setIsSettingPopoverOpen(res)
                        setTestVolume(false)
                    }}
                >
                    <PopoverTrigger asChild>
                        <Button size="icon" variant="ghost" className={isSettingPopoverOpen ? 'z-50' : null}>
                            <Settings className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="z-50 w-full ml-4">
                        <div className='flex flex-col mb-2 gap-2'>
                            <p className='text-md font-bold'>Input & Output Device Settings</p>
                            <p className='text-sm text-muted-foreground'>select or test your input and output device</p>
                        </div>
                        <div className='grid grid-cols-[1fr_1fr_200px] gap-4 w-[900px]'>
                            <div className='flex flex-col gap-4'>
                                <div className='flex flex-col gap-2'>
                                    <p>Input Device:</p>
                                    <Select
                                        value={selectedInput}
                                        onValueChange={deviceId => setSelectedInput(deviceId)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select audio input device" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {inputDevices.map(item => <SelectItem value={item.value}> {item.label} </SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <p>Output Device:</p>
                                    <Select
                                        value={selectedOutput}
                                        onValueChange={deviceId => setSelectedOutput(deviceId)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select audio Output device" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {outputDevices.map(item => <SelectItem value={item.value}> {item.label} </SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className='flex flex-col justify-start w-full'>
                                <audio autoPlay muted={!testVolume} ref={localAudioRef}></audio>
                                <canvas ref={localAudioCanvasRef} className='w-full' style={{ aspectRatio: '3/1' }}></canvas>
                                <Button
                                    className='w-full mt-2'
                                    variant="secondary"
                                    onClick={() => { setTestVolume(!testVolume) }}
                                >
                                    {!testVolume ? 'test your input & output' : 'stop testing'}
                                </Button>
                                {/*
                            {nodesRef.current.destinationNode !== null ? <AudioLevelMeter audioStream={nodesRef.current.destinationNode.stream} /> : null}
                            */}
                            </div>
                            <div className='flex flex-col justify-end items-start w-full'>

                                <p>RNN Noise Reduction</p>
                                <p className='text-muted-foreground text-xs'>noise reduction is enabled by default</p>
                                <div className='items-start'>
                                    <SwitchButton
                                        scale={0.6}
                                        checked={isNoiseReductionEnabled}
                                        onChange={(res) => {
                                            setIsNoiseReductionEnabled(res)
                                            toggleNoiseReduction(res)
                                        }}
                                    />
                                </div>
                                <p className='text-muted-foreground text-xs'>
                                    <Info className='inline-block mr-1 h-4 w-4' />this RNN noise reduction module is from <a href='https://jmvalin.ca/demo/rnnoise/' target='_blank'>https://jmvalin.ca/demo/rnnoise/</a>
                                </p>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

            </div>
        </div>
    )
}

export default UserPanel
