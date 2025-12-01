import { useEffect, useState, useRef } from 'react';
import './GameStatusOverlay.css';

interface GameStatusOverlayProps {
    gameStartTime?: number;
    gameBoardSize?: number;
    cellsToReveal: number;
    revealReward?: number;
    mineHitPenalty?: number;
    gameStatus?: number;
}

const GameStatusOverlay = ({
    gameStartTime,
    cellsToReveal,
    gameStatus = 0,
}: GameStatusOverlayProps) => {
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastGameStartTimeRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        if (gameStartTime !== undefined && gameStartTime !== null) {
            if (lastGameStartTimeRef.current !== gameStartTime) {
                setElapsedTime(0);
                lastGameStartTimeRef.current = gameStartTime;
            }
        } else {
            setElapsedTime(0);
            lastGameStartTimeRef.current = undefined;
        }

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (gameStartTime === undefined || gameStartTime === null || gameStatus !== 0) {
            return;
        }

        const updateElapsedTime = () => {
            const now = Math.floor(Date.now() / 1000);
            const start = typeof gameStartTime === 'number' ? gameStartTime : 0;
            const elapsed = now - start;
            setElapsedTime(Math.max(0, elapsed));
        };

        updateElapsedTime();

        intervalRef.current = setInterval(updateElapsedTime, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [gameStartTime, gameStatus]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="game-status-overlay">
            {gameStartTime !== undefined && (
                <div className="elapsed-time-display">
                    <span className="status-value status-time">{formatTime(elapsedTime)} <span className="status-value status-cells">{`${cellsToReveal} cells left`}</span></span>
                </div>
            )}
        </div>
    );
};

export default GameStatusOverlay;

