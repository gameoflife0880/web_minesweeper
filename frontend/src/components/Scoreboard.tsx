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
    // Convert Map to array and sort by score (descending)
    const playersArray = Array.from(players.values()).sort((a, b) => b.score - a.score);

    if (playersArray.length === 0) {
        return (
            <div className="scoreboard">
                <h3 className="scoreboard-title">Scoreboard</h3>
                <div className="scoreboard-empty">No players yet</div>
            </div>
        );
    }

    return (
        <div className="scoreboard">
            <h3 className="scoreboard-title">Scoreboard</h3>
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
        </div>
    );
};

export default Scoreboard;

