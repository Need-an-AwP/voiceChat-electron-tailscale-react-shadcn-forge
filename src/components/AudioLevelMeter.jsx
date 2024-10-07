import React, { useEffect, useRef, useState } from 'react';
import { useAudio } from '../context/AudioContext';

function AudioLevelMeter({ audioStream, className, children }) {
    const { ctx_main } = useAudio();
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);
    const divRef = useRef(null);
    const levelBarRef = useRef(null);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        if (!audioStream || !ctx_main) return;

        analyserRef.current = ctx_main.createAnalyser();
        analyserRef.current.fftSize = 256;

        const source = ctx_main.createMediaStreamSource(audioStream);
        source.connect(analyserRef.current);

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevel = () => {
            if (!analyserRef.current || !levelBarRef.current) return;

            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
            const level = Math.round((average / 255) * 100);

            // Update the background color based on the level
            setIsActive(level > 0);
            //divRef.current.style.backgroundColor = `rgba(0, 255, 0, ${level / 100})`;

            // Update the width of the level bar
            levelBarRef.current.style.width = `${level}%`;

            animationFrameRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            source.disconnect();
        };
    }, [audioStream, ctx_main]);

    return (
        <div className={`${className} relative`}>
            <div className={`
                flex flex-row items-center gap-2 z-30 
                before:content-[''] before:absolute before:inset-0 before:rounded-md
                ${isActive ? 'before:border-2 before:border-[#2d2d2d]' : ''}
                `}>
                {children}
            </div>
            <div
                ref={levelBarRef}
                className="absolute bottom-0 left-0 h-full z-20 rounded-l-md bg-[#2d2d2d] opacity-80 transition-all duration-100"
                style={{ width: '0%' }}
            />
        </div>
    );
}

export default AudioLevelMeter;