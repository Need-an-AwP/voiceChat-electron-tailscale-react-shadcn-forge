import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserRound } from "lucide-react"
import CreateDialog from "./CreateDialog"
import InviteDialog from "./InviteDialog"
import JoinDialog from "./JoinDialog"
import DeleteNetworkDialog from "./DeleteNetworkDialog"

const handleLeaveNetwork = () => { }

const handleSwitchNetwork = (networkName) => {
    //setCurrentNetworkName(networkName)
}

const NetworkPopover = ({
    userConfig,
    nodeServerUrlRef,
    currentNetworkName,
    selfIPs,
    isNetworkPopoverOpen,
    setIsNetworkPopoverOpen
}) => {
    return (
        <Popover open={isNetworkPopoverOpen} onOpenChange={setIsNetworkPopoverOpen}>
            <PopoverTrigger asChild>
                <Button className={`w-full py-8 h-[50px] border-0 rounded-[0px] ${isNetworkPopoverOpen ? 'z-50' : null}`} variant="outline">
                    <div className="flex flex-col">
                        <strong>Current Network: </strong>
                        <span>{currentNetworkName.length > 20 ? currentNetworkName.slice(0, -20) : currentNetworkName}</span>
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="m-4 mt-0 z-50 p-2 overflow-hidden" >
                <div className="space-y-2">
                    <CreateDialog
                        nodeServerUrlRef={nodeServerUrlRef}
                    />

                    <InviteDialog
                        nodeServerUrlRef={nodeServerUrlRef}
                        currentNetworkName={currentNetworkName}
                    />

                    <JoinDialog
                        nodeServerUrlRef={nodeServerUrlRef}
                        currentNetworkName={currentNetworkName}
                        selfIPs={selfIPs}
                    />

                    <Button className="w-full" variant="outline" onClick={() => handleLeaveNetwork()}>
                        Leave Current Network
                    </Button>

                    <Select value={currentNetworkName} onValueChange={(value) => handleSwitchNetwork(value)}>
                        <SelectTrigger className="w-full justify-center">
                            <SelectValue placeholder="Switch Network" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(userConfig).length > 0 && userConfig.nwList ? userConfig.nwList.map((item) => (
                                <SelectItem key={item.nwName} value={item.nwName}>
                                    <div className="flex flex-row justify-between items-center w-full gap-2">
                                        {item.admin ? <UserRound size={16} /> : null}
                                        {item.nwName}
                                    </div>
                                </SelectItem>
                            )) : null}
                        </SelectContent>
                    </Select>

                    <DeleteNetworkDialog />
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default NetworkPopover