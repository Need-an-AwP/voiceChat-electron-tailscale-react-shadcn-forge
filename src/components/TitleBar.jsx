import { useState } from 'react';
import { Minus, Square, X, SquareSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TitleBar = () => {
    const [isMaximized, setIsMaximized] = useState(false)

    return (
        <div
            className={`flex justify-between items-center  px-2 bg-white bg-opacity-5 z-50`}
            style={{ backdropFilter: 'blur(2px)' }}
        >
            <div className="flex w-full h-full" style={{ WebkitAppRegion: 'drag' }}></div>
            <div className="flex gap-2 my-0.5">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => window.ipcBridge.minimizeWindow()}
                >
                    <Minus className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                        window.ipcBridge.maximizeWindow()
                        setIsMaximized(!isMaximized)
                    }}
                >
                    {isMaximized ? <SquareSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-red-500 hover:text-white"
                    onClick={() => window.ipcBridge.closeWindow()}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default TitleBar;