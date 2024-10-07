import { useState } from 'react';
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
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip"
import { Toaster, toast } from 'sonner'
import { Switch } from "@/components/ui/switch"
import { ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Copy, CircleCheck } from "lucide-react";
import Loader from "./loader";


export default function InviteDialog({ nodeServerUrlRef, currentNetworkName }) {
    const [isOpen, setIsOpen] = useState(false);
    const [expirationTime, setExpirationTime] = useState("1h");
    const [isReusable, setIsReusable] = useState(false);
    const [inviteDialogLoading, setInviteDialogLoading] = useState(false);
    const [nodeKey, setNodeKey] = useState(null);

    const handleInviteDevice = (expirationTime, isReusable) => {
        //setInviteDialogLoading(true)
        //setTimeout(() => {
        //    setInviteDialogLoading(false)
        //    console.log('invite dialog loading end')
        //}, 1000);
        setInviteDialogLoading(true)
        fetch(`${nodeServerUrlRef.current}/request-pak`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nwName: `${currentNetworkName}`,
                reusable: isReusable,
                expiration: expirationTime
            })
        })
            .then(async res => {
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`HTTP error! status: ${res.status}, message: ${text}`);
                }
                return res.json();
            })
            .then(data => {
                console.log('PAK request response:', data);

                try {
                    const result = JSON.parse(data.result)
                    const nodeKey = result.key
                    console.log('Extracted key:', nodeKey);
                    setNodeKey(nodeKey);
                }
                catch (err) {
                    console.error('Error parsing PAK:', err);
                    setInviteDialogLoading(false);
                    return;
                }

                setInviteDialogLoading(false);
            })
            .catch(error => {
                console.error('Error requesting PAK:', error);
                setInviteDialogLoading(false);
            });
    }

    const handleCopy = () => {
        if (nodeKey) {
            navigator.clipboard.writeText(nodeKey);
            toast.custom((t) => (
                <div className='flex flex-row bg-black border border-neutral-600 rounded-md p-2 ml-20'>
                    <CircleCheck className='h-4 w-4 mr-2 mt-0.5' /> <p>Key copied to clipboard</p>
                </div>
            ))
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => {
            setIsOpen(!isOpen)
            setInviteDialogLoading(false)
            setNodeKey(null)
        }}>
            <DialogTrigger asChild>
                <Button className="w-full" variant="outline"> Invite New Device </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" showCloseIcon={false}>

                {inviteDialogLoading && (
                    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-40 flex justify-center items-center">
                        <Loader />
                    </div>
                )}

                <DialogHeader>
                    <DialogTitle>Invite New Device</DialogTitle>
                    <DialogDescription>
                        Share this key to invite a new device into your network.
                    </DialogDescription>
                </DialogHeader>

                {nodeKey === null ?
                    <div className="grid grid-rows-2 gap-2">
                        <div className="flex flex-row justify-between">
                            <p className="my-auto">expiration time</p>
                            <Select value={expirationTime} onValueChange={setExpirationTime}>
                                <SelectTrigger className="w-1/2">
                                    <SelectValue placeholder="Select expiration" />
                                </SelectTrigger>
                                <SelectContent className="h-[300px]">
                                    <SelectItem value="10m">10 minutes</SelectItem>
                                    <SelectItem value="30m">30 minutes</SelectItem>
                                    <SelectItem value="1h">1 hour</SelectItem>
                                    <SelectItem value="6h">6 hours</SelectItem>
                                    <SelectItem value="12h">12 hours</SelectItem>
                                    <SelectItem value="1d">1 day</SelectItem>
                                    <SelectItem value="7d">7 days</SelectItem>
                                    <SelectItem value="1m">1 month</SelectItem>
                                    <SelectItem value="3m">3 months</SelectItem>
                                    <SelectItem value="6m">6 months</SelectItem>
                                    <SelectItem value="1y">1 year</SelectItem>
                                    <SelectItem value="99y">Never expire</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-row justify-between">
                            <p className="my-auto ">reusable</p>
                            <Switch className="scale-120 mt-2" checked={isReusable} onCheckedChange={setIsReusable} />
                        </div>
                    </div>
                    :
                    <div className="flex flex-col text-sm gap-2">
                        <div className="flex justify-between gap-2">
                            <Input
                                id="link"
                                value={nodeKey}
                                className="text-xs"
                                readOnly
                            />
                            <Button type="button" size="sm" className="px-3" onClick={handleCopy}>
                                <span className="sr-only">Copy</span>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-col text-xs text-neutral-300 mb-4">
                            <span>this key's expiration time is {expirationTime}</span>
                            <span>and it is {isReusable ? "reusable" : "not reusable"}</span>
                        </div>
                        <Toaster position='bottom-center' />
                    </div>
                }

                <DialogFooter className="sm:justify-between mt-10">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Close
                        </Button>
                    </DialogClose>
                    <Button
                        disabled={nodeKey}
                        className="bg-neutral-200"
                        onClick={() => {
                            handleInviteDevice(expirationTime, isReusable);
                        }}
                    >
                        Confirm
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}