import React, { useEffect, useRef } from 'react'
import { Card } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Avatar } from "@/components/ui/avatar"
import { useRTC } from '../context/RTCContext'
import Lottie from 'lottie-react';
import hotBeverage from '@/assets/lottieEmojis/hot-beverage.json'


function ChatDisplay({ selfIPs }) {
    const { roomChat: messages } = useRTC()
    const scrollAreaRef = useRef(null)
    const currentUserIp = selfIPs.ipv4

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
            scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: 'smooth'
            })
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])


    return (
        <>{messages.length > 0 ?
            <ScrollArea ref={scrollAreaRef} className="h-full w-full">
                <div className="flex flex-col space-y-4 p-4 pb-0">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.origin.ipv4 === currentUserIp ? 'justify-end' : 'justify-start'}`}
                        >
                            <Card
                                className={`max-w-[70%] border-none 'bg-[#2A2A2A]'}`}
                                style={{ overflow: 'hidden' }}
                            >

                                <div className="flex items-start space-x-2">
                                    {message.origin.ipv4 !== currentUserIp ?
                                        <div className='p-4'>
                                            {message.origin.ipv4 !== currentUserIp && (
                                                <span className="text-xs">{message.origin.ipv4}</span>
                                            )}
                                        </div> : null}
                                    <div className="flex flex-col space-y-1 bg-[#1D1F21] p-4 justify-end">
                                        <span className="text-xs text-muted-foreground"> {message.timestamp} </span>
                                        <p className="text-sm  ">{message.content}</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="vertical" />
            </ScrollArea> :
            <div className='flex flex-col justify-center items-center h-screen space-y-4'>
                <Lottie
                    className='w-20 h-20'
                    style={{ filter: 'saturate(0.01)' }}
                    animationData={hotBeverage}
                    loop={true}
                    autoplay={true}
                />
                <p className='text-muted-foreground'>No Messages To Show Here</p>
            </div>}
        </>
    )
}

export default ChatDisplay