import { useEffect, useState } from 'react';
import './GameStatusOverlay.css';

interface GameStatusOverlayProps {
    gameStartTime?: number;
    gameBoardSize?: number;
    cellsToReveal: number;
    revealReward?: number;
    mineHitPenalty?: number;
}

const GameStatusOverlay = ({
    gameStartTime,
    gameBoardSize,
    cellsToReveal,
    revealReward,
    mineHitPenalty,
}: GameStatusOverlayProps) => {
    const [elapsedTime, setElapsedTime] = useState<number>(0);

    useEffect(() => {
        if (gameStartTime === undefined || gameStartTime === null) {
            setElapsedTime(0);
            return;
        }

        const updateElapsedTime = () => {
            // gameStartTime is in seconds (Unix timestamp)
            // Date.now() returns milliseconds, so divide by 1000 to get seconds
            const now = Math.floor(Date.now() / 1000);
            const start = typeof gameStartTime === 'number' ? gameStartTime : 0;
            const elapsed = now - start;
            setElapsedTime(Math.max(0, elapsed));
        };

        // Update immediately
        updateElapsedTime();

        // Update every second
        const interval = setInterval(updateElapsedTime, 1000);

        return () => clearInterval(interval);
    }, [gameStartTime]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="game-status-overlay">
            {gameStartTime !== undefined && (
                <div>Elapsed: <span className="status-value status-time">{formatTime(elapsedTime)}</span></div>
            )}
            <div>To reveal: <span className="status-value status-cells">{`${cellsToReveal} cells`}</span></div>
            {gameBoardSize !== undefined && (
                <div>Board: <span className="status-value status-size">{`${gameBoardSize}x${gameBoardSize} (${gameBoardSize * gameBoardSize} cells)`}</span></div>
            )}
            {mineHitPenalty !== undefined && (
                <div>Hit penalty: <span className="status-value status-penalty">{mineHitPenalty}</span></div>
            )}
        </div>
    );
};

export default GameStatusOverlay;

