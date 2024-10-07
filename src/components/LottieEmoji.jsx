import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import Lottie from 'lottie-react';



const LottieEmoji = ({ currentState, setCurrentState, size = '100px' }) => {
    const [emojis, setEmojis] = useState([]);
    const [isHovering, setIsHovering] = useState(false);
    const lottieRef = useRef();

    useEffect(() => {
        const loadEmojis = async () => {
            const jsonModules = import.meta.glob('@/assets/lottieEmojis/*.json');
            const svgModules = import.meta.glob('@/assets/lottieEmojis/*.svg');
            const loadedEmojis = [];

            for (const jsonPath in jsonModules) {
                const name = jsonPath.split('/').pop().split('.')[0];
                const svgPath = jsonPath.replace('.json', '.svg');

                // 检查是否存在对应的 SVG 文件
                if (svgModules[svgPath]) {
                    const jsonModule = await jsonModules[jsonPath]();
                    const svgModule = await svgModules[svgPath]();
                    loadedEmojis.push({
                        name,
                        json: jsonModule.default,
                        svg: svgModule.default
                    });
                }
            }

            setEmojis(loadedEmojis);
        };

        loadEmojis();
    }, []);

    const EmojiItem = useCallback(({ emoji }) => {
        const itemLottieRef = useRef();
        useEffect(() => {
            if (itemLottieRef.current) {
                itemLottieRef.current.setSpeed(0.8)
            }
        }, [])
        return (
            <div
                className="cursor-pointer flex flex-col items-center justify-center"
                onClick={() => {
                    setCurrentState(emoji.name)
                }}
            >
                <Lottie
                    animationData={emoji.json}
                    loop={true}
                    autoplay={true}
                    className="w-[60px] h-[60px]"
                />
                <p className="text-xs whitespace-nowrap overflow-hidden text-ellipsis">{emoji.name}</p>
            </div>
        );
    }, []);

    const handleMouseEnter = () => {
        setIsHovering(true);
        if (lottieRef.current) {
            lottieRef.current.play();
            lottieRef.current.setSpeed(0.8)
        }
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        if (lottieRef.current) {
            lottieRef.current.stop();
        }
    };

    return (
        <Popover>
            <PopoverTrigger>
                <div
                    className="cursor-pointer"
                    style={{ width: size, height: size }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {isHovering ? (
                        <Lottie
                            lottieRef={lottieRef}
                            animationData={emojis.find(emoji => emoji.name === currentState)?.json}
                            loop={true}
                            autoplay={true}
                        />
                    ) : (
                        <img
                            src={emojis.find(emoji => emoji.name === currentState)?.svg}
                            alt="Emoji"
                        />
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={4} className="w-full p-0">
                <ScrollArea className="h-[320px] p-4">
                    <div className=" grid grid-cols-4 gap-x-10 gap-y-6">
                        {emojis.map(emoji => (
                            <EmojiItem key={emoji.name} emoji={emoji} />
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};

export default LottieEmoji;