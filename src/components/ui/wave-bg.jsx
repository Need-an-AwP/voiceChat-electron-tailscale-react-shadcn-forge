"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { createNoise3D } from "simplex-noise";

export const WavyBackground = ({
    children,
    className,
    containerClassName,
    colors,
    waveWidth,
    backgroundFill,
    blur = 10,
    speed = "fast",
    waveOpacity = 0.5,
    amplitude = 100, // 新添加的振幅参数
    ...props
}) => {
    const noise = createNoise3D();
    let w, h, nt, i, x, ctx, canvas;
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [opacity, setOpacity] = useState(0);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            setDimensions({ width, height });
        }
    }, []);

    useEffect(() => {
        if (isHovered) {
            setOpacity(1);
            init();
        } else {
            setOpacity(0);
        }
        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [isHovered]);

    useEffect(() => {
        if (canvasRef.current && dimensions.width && dimensions.height) {
            canvasRef.current.width = dimensions.width;
            canvasRef.current.height = dimensions.height;
            init();
        }
    }, [dimensions]);

    const getSpeed = () => {
        switch (speed) {
            case "slow":
                return 0.001;
            case "fast":
                return 0.002;
            case "faster":
                return 0.005;
            default:
                return 0.001;
        }
    };

    const init = () => {
        canvas = canvasRef.current;
        ctx = canvas.getContext("2d");
        w = ctx.canvas.width = window.innerWidth;
        h = ctx.canvas.height = window.innerHeight;
        ctx.filter = `blur(${blur}px)`;
        nt = 0;
        window.onresize = function () {
            w = ctx.canvas.width = window.innerWidth;
            h = ctx.canvas.height = window.innerHeight;
            ctx.filter = `blur(${blur}px)`;
        };
        render();
    };

    const waveColors = colors ?? [
        "#38bdf8",
        "#818cf8",
        "#c084fc",
        "#e879f9",
        "#22d3ee",
    ];
    const drawWave = (n) => {
        nt += getSpeed();
        for (i = 0; i < n; i++) {
            ctx.beginPath();
            ctx.lineWidth = waveWidth || 50;
            ctx.strokeStyle = waveColors[i % waveColors.length];
            for (x = 0; x < w; x += 5) {
                var y = noise(x / 800, 0.3 * i, nt) * amplitude; // 使用 amplitude 参数
                ctx.lineTo(x, y + h * 0.5); // 调整波浪的垂直位置
            }
            ctx.stroke();
            ctx.closePath();
        }
    };

    let animationId;
    const render = () => {
        // 清除整个 canvas，使背景透明
        ctx.clearRect(0, 0, w, h);

        // 设置全局透明度
        ctx.globalAlpha = waveOpacity;

        drawWave(5);
        animationId = requestAnimationFrame(render);
    };

    const [isSafari, setIsSafari] = useState(false);
    useEffect(() => {
        // I'm sorry but i have got to support it on safari.
        setIsSafari(typeof window !== "undefined" &&
            navigator.userAgent.includes("Safari") &&
            !navigator.userAgent.includes("Chrome"));
    }, []);

    return (
        (<div
            ref={containerRef}
            className={cn("relative overflow-hidden", containerClassName)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <canvas
                className="absolute inset-0 z-0 transition-opacity duration-500 ease-in-out"
                ref={canvasRef}
                style={{
                    width: '100%',
                    height: '100%',
                    opacity: opacity,
                    ...(isSafari ? { filter: `blur(${blur}px)` } : {}),
                }}
            ></canvas>
            <div className={cn("relative z-10", className)} {...props}>
                {children}
            </div>
        </div>)
    );
};
