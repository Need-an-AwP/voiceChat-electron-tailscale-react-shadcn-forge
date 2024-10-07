import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { useRTC } from '../context/RTCContext'

const ChatInputBox = ({ selfIPs }) => {
    const { dataChannels, setRoomChat } = useRTC()
    const [sendTextInput, setSendTextInput] = useState('')

    const dataChannelSend = () => {
        if (sendTextInput.length !== 0) {
            console.log(sendTextInput)
            Object.entries(dataChannels).forEach(([ip, dataChannel]) => {
                if (dataChannel.readyState === 'open') {
                    dataChannel.send(JSON.stringify({
                        type: 'chat_message',
                        origin: { ipv4: selfIPs.ipv4, ipv6: selfIPs.ipv6 },
                        content: sendTextInput,
                        timestamp: Date.now()
                    }))
                }
            })

            setRoomChat(prev => ([
                ...prev,
                { origin: { ipv4: selfIPs.ipv4, ipv6: selfIPs.ipv6 }, content: sendTextInput, timestamp: Date.now() }
            ]))
            setSendTextInput('')
        }
    }

    return (
        <div className="p-4 pt-0 mt-auto">
            <div className="flex flex-row gap-2">
                <Input
                    className="flex-grow bg-[#2d2d2d] rounded-full"
                    placeholder="Type message here..."
                    value={sendTextInput}
                    onChange={(e) => { setSendTextInput(e.target.value) }}
                    clearButton={true}
                    onClear={() => { setSendTextInput('') }}
                />
                <Button className="p-2 rounded-full" onClick={() => dataChannelSend()}>
                    <Send className="mt-0.5" />
                </Button>
            </div>

        </div>
    )
}

export default ChatInputBox;
