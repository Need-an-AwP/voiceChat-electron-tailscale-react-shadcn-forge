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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Toaster, toast } from 'sonner'
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import Loader from "./loader";
import { Dices, Copy, CircleCheck } from 'lucide-react';
import { adjectives, nouns } from './wordList';




export default function CreateDialog({ nodeServerUrlRef, joinNewNetwork }) {
    const [isOpen, setIsOpen] = useState(false);
    const [networkName, setNetworkName] = useState("");
    const [createDialogLoading, setCreateDialogLoading] = useState(false);
    const [newNetworkInfo, setNewNetworkInfo] = useState(null)

    const handleCreateNetwork = (networkName) => {
        const timestamp = Date.now();
        const randomChars = Math.random().toString(36).substring(2, 7); // 生成5个随机字符
        const uniqueNetworkName = `${networkName}-${timestamp}-${randomChars}`;
        console.log(uniqueNetworkName)
        setCreateDialogLoading(true);

        fetch(`${nodeServerUrlRef.current}/create-nw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nwName: uniqueNetworkName })
        })
            .then(async res => {
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`HTTP error! status: ${res.status}, message: ${text}`);
                }
                return res.json();
            })
            .then(data => {
                console.log('create network response:', data)
                try {
                    const result = JSON.parse(data.result)
                    const nodeKey = result.key
                    console.log('new network key:', nodeKey);
                    setNewNetworkInfo({ nwName: uniqueNetworkName, nodeKey: nodeKey });
                }
                catch (err) {
                    console.error('Error parsing PAK:', err);
                    setCreateDialogLoading(false);
                    return;
                }

                setCreateDialogLoading(false);
            })
            .catch(err => {
                console.error(err)
                setCreateDialogLoading(false);
            })
    };

    const handleOpenChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setCreateDialogLoading(false);
            setNetworkName(""); // Reset the network name when closing
            setNewNetworkInfo(null)
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(newNetworkInfo.nodeKey);
        toast.custom((t) => (
            <div className='flex flex-row bg-black border border-neutral-600 rounded-md p-2 ml-20'>
                <CircleCheck className='h-4 w-4 mr-2 mt-0.5' /> <p>Key copied to clipboard</p>
            </div>
        ))
    };

    const generateRandomName = () => {
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        setNetworkName(`${randomAdjective}-${randomNoun}`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="w-full" variant="outline"> Create New Network & Join </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" showCloseIcon={false}>
                {createDialogLoading && (
                    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-40 flex justify-center items-center">
                        <Loader />
                    </div>
                )}
                {newNetworkInfo !== null ?
                    <div>
                        <div className='space-y-4'>
                            <DialogHeader>
                                <DialogTitle>Network created successfully!</DialogTitle>
                                <DialogDescription>
                                    Network Name: {newNetworkInfo.nwName}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col text-sm gap-2">
                                <span>Here is your sigle-use admin key:</span>
                                <div className="flex justify-between">
                                    <Input
                                        value={newNetworkInfo.nodeKey}
                                        className="flex-grow text-sm"
                                        readOnly
                                    />
                                    <Button type="button" size="sm" className="px-3" onClick={handleCopy}>
                                        <span className="sr-only">Copy</span>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-col text-xs text-neutral-300">
                                    <span>this is the only time you will see this key</span>
                                    <span>this key has no expiration time</span>
                                    <span>you can join this network right now by clicking the button below</span>
                                    <span>or you can use use it later</span>
                                    <span>keep it safe and secure</span>
                                </div>
                                <Toaster position='bottom-right' />
                            </div>
                        </div>
                        <DialogFooter className="sm:justify-between mt-10">
                            <DialogClose asChild>
                                <Button onClick={() => joinNewNetwork()}>
                                    Join New Network
                                </Button>
                            </DialogClose>

                        </DialogFooter>
                    </div>
                    :
                    <div>
                        <div className='space-y-4'>
                            <DialogHeader>
                                <DialogTitle>Create New Network</DialogTitle>
                                <DialogDescription>
                                    Enter a name for your new network.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex items-center space-x-2">

                                <TooltipProvider delayDuration={100} >
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Input
                                                id="network-name"
                                                value={networkName}
                                                onChange={(e) => setNetworkName(e.target.value.replace(/[^a-z0-9-_]/g, ''))}
                                                className="flex-grow text-sm"
                                                placeholder="Enter network name"
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" sideOffset={10} className="text-xs border-0">
                                            <span>Only lowercase letters, numbers, - and _ are allowed</span>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={generateRandomName}
                                    title="Generate random name"
                                >
                                    <Dices className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <DialogFooter className="sm:justify-between mt-10">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Close
                                </Button>
                            </DialogClose>
                            <Button onClick={() => handleCreateNetwork(networkName)} disabled={networkName.length < 3}>
                                Create Network
                            </Button>
                        </DialogFooter>
                    </div>
                }
            </DialogContent>
        </Dialog>
    );
}