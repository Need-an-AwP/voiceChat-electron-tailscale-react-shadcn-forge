import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"


const handleDeleteNetwork = () => {
    console.log('delete network')
}

export default function LeaveNetworkDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleteNetworkLoading, setIsDeleteNetworkLoading] = useState(false);

    const handleOpenChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setIsDeleteNetworkLoading(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
            <AlertDialogTrigger>
                <Button className='w-[200px]' disabled={false} variant="destructive">
                    Delete Network
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>

                {isDeleteNetworkLoading && (
                    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-40 flex justify-center items-center">
                        <Loader />
                    </div>
                )}

                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete this tailscale network and delete all data associated with this network.
                        <br />
                        Members of this tailscale network cannot join anymore.
                        <br />
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteNetwork()}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
