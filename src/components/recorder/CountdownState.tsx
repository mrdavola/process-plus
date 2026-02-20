"use client";

import { useEffect, useRef, useState } from "react";

interface CountdownStateProps {
    stream: MediaStream;
    onComplete: () => void;
}

export default function CountdownState({ stream, onComplete }: CountdownStateProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [count, setCount] = useState(3);
    const onCompleteRef = useRef(onComplete);
    const mountedRef = useRef(true);
    onCompleteRef.current = onComplete;

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    useEffect(() => {
        if (count === 0) {
            if (mountedRef.current) {
                onCompleteRef.current();
            }
            return;
        }
        const timer = setTimeout(() => {
            if (mountedRef.current) setCount(c => c - 1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [count]);

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none">

            <div className="relative z-10 flex flex-col items-center">
                <div
                    key={count}
                    className="text-[160px] font-black text-white leading-none select-none"
                    style={{
                        animation: "countdownPop 1s ease-out forwards",
                        textShadow: "0 0 60px rgba(14, 165, 233, 0.8)",
                    }}
                >
                    {count === 0 ? "GO!" : count}
                </div>
                <p className="text-white/70 text-xl font-bold mt-4 tracking-widest uppercase">
                    Get Ready...
                </p>
            </div>

            <style>{`
                @keyframes countdownPop {
                    0% { transform: scale(1.4); opacity: 0; }
                    20% { transform: scale(1); opacity: 1; }
                    80% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(0.8); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
