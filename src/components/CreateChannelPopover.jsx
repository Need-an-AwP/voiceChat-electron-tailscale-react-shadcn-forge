import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useRTC } from '../context/RTCContext'


const CreateChannelPopover = ({ isChannelPopoverOpen, setIsChannelPopoverOpen }) => {
    const { rtcLocalPCs } = useRTC()
    const [newChannelInfo, setNewChannelInfo] = useState({})

    const handleCreateChannel = () => {
        const newChannel = {
            channel_name: newChannelInfo.channel_name,
            channel_id: `${newChannelInfo.channel_name}-${Date.now()}`,
            create_time: Date.now()
        }

    }

    return (
        <Popover open={isChannelPopoverOpen} onOpenChange={setIsChannelPopoverOpen}>
            <PopoverTrigger asChild>
                <Button className={`justify-start pl-5 border-0 rounded-[0px] ${isChannelPopoverOpen ? 'z-50' : null}`} variant="link">
                    <Plus className="mr-2 h-4 w-4" /> Create channel
                </Button>
            </PopoverTrigger>
            <PopoverContent className='m-4 mt-0 z-50 w-full'>
                <div className='flex flex-col gap-4'>
                    <span className='text-sm'>Voice Channel Name</span>
                    <div className="flex flex-row gap-2">
                        <Input
                            placeholder="type channel name"
                            value={newChannelInfo.channel_name}
                            onChange={(e) => setNewChannelInfo({ ...newChannelInfo, channel_name: e.target.value })}
                        />
                    </div>

                    <div className="flex flex-row justify-between">
                        <Label className='text-sm'>Private Channel</Label>
                        <Switch disabled={true} />
                    </div>
                    <Button
                        className="bg-neutral-500"
                        variant="outline"
                        onClick={() => { handleCreateChannel(); setIsChannelPopoverOpen(false) }}
                        disabled={Object.keys(newChannelInfo).length === 0 || newChannelInfo.channel_name === null || newChannelInfo.channel_name === ''}
                    >
                        Create
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default CreateChannelPopover