import { useEffect } from "react"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import LottieEmoji from "./LottieEmoji"
import { useState } from "react"
import { useInVoiceChannel } from "../context/InVoiceChannelContext"

const EditProfileDialog = ({ userConfig, setUserConfig }) => {
    const { inVoiceChannel } = useInVoiceChannel()

    const [currentName, setCurrentName] = useState(userConfig.user_name)
    const [currentState, setCurrentState] = useState(userConfig.user_state)
    const [currentControllerUrl, setCurrentControllerUrl] = useState(userConfig.controllerUrl)
    const [currentNodeServerUrl, setCurrentNodeServerUrl] = useState(userConfig.nodeServerUrl)
    const [currentStateSvg, setCurrentStateSvg] = useState(null);

    useEffect(() => {
        setCurrentName(userConfig.user_name)
        setCurrentState(userConfig.user_state)
        setCurrentControllerUrl(userConfig.controllerUrl)
        setCurrentNodeServerUrl(userConfig.nodeServerUrl)
    }, [userConfig])

    useEffect(() => {
        const loadSvg = async () => {
            try {
                const svgModule = await import(`@/assets/lottieEmojis/${currentState}.svg`);
                setCurrentStateSvg(svgModule.default);
            } catch (error) {
                console.error('Failed to load SVG:', error);
            }
        };
        if (currentState) {
            loadSvg();
        }
    }, [currentState])

    return (
        <Dialog>
            <DialogTrigger asChild>
                {currentName && (
                    <div>
                        <Button variant="ghost" className="flex items-center py-6 pl-2">
                            <Avatar className="h-10 w-10 mr-2">
                                <AvatarImage src={"/user-avatar.jpg"} alt="User" />
                                <AvatarFallback className="text-l justify-center items-center bg-neutral-500">
                                    {userConfig.user_name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <div className="text-sm font-medium text-white">{userConfig.user_name}</div>
                                {currentStateSvg &&
                                    <img
                                        className="w-5 h-5"
                                        src={currentStateSvg}
                                        alt={currentState}
                                    />}
                            </div>
                        </Button>
                    </div>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit profile</DialogTitle>
                    <DialogDescription>
                        Make changes to your profile here
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-[auto,1fr] items-center gap-4">

                        <Label>Set a State</Label>
                        <LottieEmoji
                            currentState={currentState}
                            setCurrentState={setCurrentState}
                        />

                        <Label htmlFor="username" className="text-right">
                            Username
                        </Label>
                        <Input
                            id="username"
                            defaultValue={currentName}
                            onChange={(e) => {
                                setCurrentName(e.target.value)
                            }}
                        />

                        <Label htmlFor="controller" className="text-right">
                            Controller
                        </Label>
                        <Input
                            id="controller"
                            defaultValue={currentControllerUrl}
                            onChange={(e) => {
                                setCurrentControllerUrl(e.target.value)
                            }}
                        />

                        <Label htmlFor="server" className="text-right">
                            Server
                        </Label>
                        <Input
                            id="server"
                            defaultValue={currentNodeServerUrl}
                            onChange={(e) => {
                                setCurrentNodeServerUrl(e.target.value)
                            }}
                        />
                    </div>
                </div>
                <DialogFooter className="sm:justify-between mt-10">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Close
                        </Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button
                            disabled={Object.keys(inVoiceChannel).length !== 0}
                            type="submit"
                            onClick={() => {
                                setUserConfig({
                                    user_name: currentName,
                                    user_state: currentState,
                                    controllerUrl: currentControllerUrl,
                                    nodeServerUrl: currentNodeServerUrl,
                                })
                            }}
                        >Save changes</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    )
}

export default EditProfileDialog