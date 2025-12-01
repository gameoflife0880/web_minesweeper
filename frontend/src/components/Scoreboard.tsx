import { useState } from 'react';
import './Scoreboard.css';

export interface Player {
    playerID: string;
    playerName: string;
    score: number;
    totalMineHits: number;
    activeFlagCount: number;
    isLoggedIn: boolean;
}

interface ScoreboardProps {
    players: Map<string, Player>;
}

const Scoreboard = ({ players }: ScoreboardProps) => {
    const [isMinimized, setIsMinimized] = useState<boolean>(false);
    
    // Convert Map to array and sort by score (descending)
    const playersArray = Array.from(players.values()).sort((a, b) => b.score - a.score);

    const toggleMinimize = () => {
        setIsMinimized(!isMinimized);
    };

    return (
        <div className={`scoreboard ${isMinimized ? 'minimized' : ''}`}>
            <div className="scoreboard-header" onClick={toggleMinimize}>
                <h3 className="scoreboard-title">Scoreboard</h3>
                <span className={`toggle-icon ${isMinimized ? 'minimized' : ''}`}>▼</span>
            </div>
            {!isMinimized && (
                <div className="scoreboard-body">
                    {playersArray.length === 0 ? (
                        <div className="scoreboard-empty">No players yet</div>
                    ) : (
                        <div className="scoreboard-content">
                            {playersArray.map((player) => (
                                <div key={player.playerID} className="scoreboard-player">
                                    {!player.isLoggedIn && <span className="player-badge">G</span>}
                                    <span className="player-name">{player.playerName}</span>
                                    <span className="player-score">{player.score}</span>
                                    <span className="player-stat">
                                        <span className="stat-icon">💥</span>
                                        <span className="stat-value">{player.totalMineHits}</span>
                                    </span>
                                    <span className="player-stat">
                                        <span className="stat-icon">🚩</span>
                                        <span className="stat-value">{player.activeFlagCount}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Scoreboard;

