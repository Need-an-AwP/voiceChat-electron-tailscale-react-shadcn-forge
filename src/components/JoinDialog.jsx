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
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import Loader from "./loader";

export default function JoinDialog({ nodeServerUrlRef, currentNetworkName, selfIPs }) {
    const [isOpen, setIsOpen] = useState(false);
    const [nodeKey, setNodeKey] = useState("");
    const [joinDialogLoading, setJoinDialogLoading] = useState(false)

    const handleJoinNetwork = (nodeKey) => {
        console.log('Joining network with key:\n', nodeKey);
        setJoinDialogLoading(true);
        //delete node of myself then join with preauth key
        fetch(`${nodeServerUrlRef.current}/delete-node`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nwName: currentNetworkName,
                selfIPv4: selfIPs.ipv4,
                selfIPv6: selfIPs.ipv6
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
                if (data.message === 'success') {
                    console.log('node have deleted')
                    window.ipcBridge.send('joinNetwork', nodeKey);
                } else if (data.message === 'node not found') {
                    console.log('cannot found node by given info', JSON.parse(data.result))
                    window.ipcBridge.send('joinNetwork', nodeKey);
                }

                setJoinDialogLoading(false);
            })

        setJoinDialogLoading(false);
    }

    const handleOpenChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setJoinDialogLoading(false);
            setNodeKey(""); // Reset the join key when closing
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="w-full" variant="outline">Join a Network</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" showCloseIcon={false}>
                {joinDialogLoading && (
                    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-40 flex justify-center items-center">
                        <Loader />
                    </div>
                )}

                <DialogHeader>
                    <DialogTitle>Join Network</DialogTitle>
                    <DialogDescription>
                        Enter a 48 character length key to connect to an existing network.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                    <Input
                        id="join-key"
                        value={nodeKey}
                        onChange={(e) => setNodeKey(e.target.value)}
                        className="col-span-3 text-xs"
                    />
                </div>
                <DialogFooter className="sm:justify-between">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Close
                        </Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button onClick={() => handleJoinNetwork(nodeKey)} disabled={nodeKey.length !== 48}>
                            Join Network
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}