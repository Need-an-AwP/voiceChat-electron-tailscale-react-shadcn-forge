import React from 'react';
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
import { Slider } from "@/components/ui/slider"
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Volume2 } from 'lucide-react';

const VoiceChannelButton = ({
    item,
    activeRTCconnectionNum,
    userConfig,
    selfIPv4,
    selfIPv6,
    inVoiceChannel,
    setInVoiceChannel
}) => {

    const handleDoubleClick = () => {
        //console.log(item)
        const localUser = {
            user_name: userConfig.user_name,
            ip: { ipv4: selfIPv4, ipv6: selfIPv6 },
            local_audio_state: { inputMuted: false, outputMuted: false },
            remote_audio_state: { inputMuted: false, outputMuted: false },
            volume: 1,
        };
        setInVoiceChannel({
            ...item,
            localUser: localUser
        });
    };

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


    return (
        <div className="pr-2">
            <Button
                variant="ghost"
                className="w-full justify-start border-0"
                disabled={activeRTCconnectionNum <= 0}
                onDoubleClick={handleDoubleClick}
            >
                <Volume2 className="mr-2 h-4 w-4" /> {item.channel_name}
            </Button>
            <div className="pl-10 flex flex-col">
                {/*Object.keys(inVoiceChannel).length > 0 && inVoiceChannel.channel_id === item.channel_id && (
                    <div
                        key={inVoiceChannel.localUser.user_name}
                        className="my-1 p-1 pr-0 flex flex-row gap-2 items-center rounded-md hover:bg-secondary"
                    >
                        <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src="/user-avatar.jpg" alt="User" />
                            <AvatarFallback className="text-md justify-center items-center bg-neutral-500">
                                {inVoiceChannel.localUser.user_name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="text-sm font-medium text-white">{inVoiceChannel.localUser.user_name}</div>
                    </div>
                )*/}
                {item.inChannelUsers.length > 0 && item.inChannelUsers.map((user, index) => {
                    if (user.user_name === userConfig.user_name) {
                        return (
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
                            <ContextMenu>
                                <ContextMenuTrigger>
                                    <div key={index} className="my-1 p-1 pr-0 flex flex-row gap-2 items-center rounded-md hover:bg-secondary">
                                        <Avatar className="h-8 w-8 mr-2">
                                            <AvatarImage src="/user-avatar.jpg" alt="User" />
                                            <AvatarFallback className="text-md justify-center items-center bg-neutral-500">
                                                {user.user_name.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="text-sm font-medium text-white">{user.user_name}</div>
                                    </div>
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
    );
};

export default VoiceChannelButton;