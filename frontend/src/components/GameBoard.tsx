import { useEffect, useState, useCallback, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import Cell, { type CellData } from './Cell';
import Scoreboard, { type Player } from './Scoreboard';
import GameStatusOverlay from './GameStatusOverlay';
import './GameBoard.css';

const GameStatus = {
    InProgress: 0,
    Ended: 1,
} as const;

type GameStatus = typeof GameStatus[keyof typeof GameStatus];

interface GameboardState {
    cells: CellData[][];
    cellsToReveal: number;
    gameConstants: Record<string, unknown>;
    gameStatus: GameStatus;
}

interface CellUpdate {
    type: string;
    x: number;
    y: number;
    playerID: string;
    cell: {
        isRevealed: boolean;
        isMine: boolean;
        adjacentMines: number;
        flagState: number;
        flagOwnerID: string;
    };
}


interface ScoreboardAction {
    type: string;
    value?: number;
    playerID?: string;
    player: Player;
}

const GameBoard = () => {
    const { isConnected, messageQueue, sendAction, removeProcessedMessages } = useWebSocket();

    const [gameboardState, setGameboardState] = useState<GameboardState>({
        cells: [],
        cellsToReveal: 0,
        gameConstants: {},
        gameStatus: GameStatus.InProgress,
    } as GameboardState);

    // Store players data for scoreboard
    const [players, setPlayers] = useState<Map<string, Player>>(new Map());

    useEffect(() => {
        if (messageQueue.length > 0) {
            // Create a copy of the queue to process, so we don't lose messages that arrive during processing
            const messagesToProcess = [...messageQueue];
            
            messagesToProcess.forEach((message) => {
                try {
                    const update = JSON.parse(message);
                    const payload = update.payload;
                    const messageType = update.type?.trim();
                    
                    switch (messageType) {
                        case "GAME_STATUS":
                            if (payload?.gameStatus === GameStatus.Ended || payload?.gameStatus === GameStatus.InProgress) {
                                setGameboardState(prevState => ({
                                    ...prevState,
                                    gameStatus: payload.gameStatus as GameStatus,
                                }));
                            }
                            break;
                        case "GAMEBOARD_STATE":
                            setGameboardState({
                                cells: payload.cells,
                                cellsToReveal: payload.cellsToReveal,
                                gameConstants: payload.gameConstants,
                                gameStatus: payload?.gameStatus ? (payload.gameStatus as GameStatus) : GameStatus.InProgress,
                            });
                            // Initialize players from gameboard state - replace entirely to match server state
                            if (payload.players && Array.isArray(payload.players)) {
                                const newPlayers = new Map<string, Player>();
                                payload.players.forEach((player: Player) => {
                                    newPlayers.set(player.playerID, player);
                                });
                                setPlayers(newPlayers);
                                console.log(`Initialized ${newPlayers.size} players from gameboard state`);
                            }
                            break;
                        case "CELL":
                            // Handle incremental cell updates
                            if (payload.cellUpdates && Array.isArray(payload.cellUpdates)) {
                                setGameboardState(prevState => {
                                    // Only update if we have existing cells
                                    if (!prevState.cells || prevState.cells.length === 0) {
                                        return prevState;
                                    }

                                    // Create a deep copy of the cells array
                                    const newCells = prevState.cells.map(row => [...row]);
                                    let cellsRevealedCount = 0;

                                    // Apply each cell update and track revealed changes
                                    payload.cellUpdates.forEach((cellUpdate: CellUpdate) => {
                                        const { x, y, cell } = cellUpdate;
                                        
                                        // Validate coordinates
                                        if (
                                            x >= 0 && 
                                            x < newCells.length && 
                                            y >= 0 && 
                                            y < newCells[x]?.length
                                        ) {
                                            const oldCell = newCells[x][y];
                                            
                                            // Count cells that changed from unrevealed to revealed and are not mines
                                            if (!oldCell.isRevealed && cell.isRevealed && !cell.isMine) {
                                                cellsRevealedCount++;
                                            }
                                            
                                            // Update the cell at the specified coordinates
                                            newCells[x][y] = {
                                                isRevealed: cell.isRevealed,
                                                isMine: cell.isMine,
                                                adjacentMines: cell.adjacentMines,
                                                flagState: cell.flagState,
                                                flagOwnerID: cell.flagOwnerID ? cell.flagOwnerID : undefined,
                                            };
                                        }
                                    });

                                    // Update cellsToReveal incrementally based on actual changes
                                    const newCellsToReveal = Math.max(0, prevState.cellsToReveal - cellsRevealedCount);

                                    return {
                                        ...prevState,
                                        cells: newCells,
                                        cellsToReveal: newCellsToReveal,
                                    };
                                });
                            }
                            
                            // Handle scoreboard updates from cell actions
                            if (payload.scoreboardUpdates && Array.isArray(payload.scoreboardUpdates)) {
                                setPlayers(prevPlayers => {
                                    const newPlayers = new Map(prevPlayers);
                                    
                                    payload.scoreboardUpdates.forEach((update: ScoreboardAction) => {
                                        const playerID = update.playerID;
                                        if (!playerID) return;
                                        
                                        const player = newPlayers.get(playerID);
                                        if (!player) return;
                                        
                                        // Create updated player object
                                        const updatedPlayer: Player = { ...player };
                                        
                                        switch (update.type) {
                                            case "SCORE":
                                                if (update.value !== undefined) {
                                                    updatedPlayer.score = Math.max(0, updatedPlayer.score + update.value);
                                                }
                                                break;
                                            case "MINE_HIT_INCREMENT":
                                                updatedPlayer.totalMineHits += 1;
                                                break;
                                            case "FLAG_INCREMENT":
                                                updatedPlayer.activeFlagCount += 1;
                                                break;
                                            case "FLAG_DECREMENT":
                                                updatedPlayer.activeFlagCount = Math.max(0, updatedPlayer.activeFlagCount - 1);
                                                break;
                                        }
                                        
                                        newPlayers.set(playerID, updatedPlayer);
                                    });
                                    
                                    return newPlayers;
                                });
                            }
                            break;
                        case "REGISTER":
                            // Handle player registration
                            if (payload?.scoreboardUpdates) {
                                const scoreboardAction = payload.scoreboardUpdates as ScoreboardAction;
                                if (scoreboardAction.player) {
                                    setPlayers(prevPlayers => {
                                        const newPlayers = new Map(prevPlayers);
                                        newPlayers.set(scoreboardAction.player.playerID, scoreboardAction.player);
                                        return newPlayers;
                                    });
                                    console.log(`Player registered: ${scoreboardAction.player.playerName} (${scoreboardAction.player.playerID})`);
                                }
                            }
                            break;
                        case "UNREGISTER":
                            // Handle player unregistration
                            if (payload?.scoreboardUpdates) {
                                const scoreboardAction = payload.scoreboardUpdates as ScoreboardAction;
                                if (scoreboardAction.player) {
                                    setPlayers(prevPlayers => {
                                        const newPlayers = new Map(prevPlayers);
                                        newPlayers.delete(scoreboardAction.player.playerID);
                                        return newPlayers;
                                    });
                                    console.log(`Player unregistered: ${scoreboardAction.player.playerName} (${scoreboardAction.player.playerID})`);
                                }
                            }
                            break;
                    }
                } catch (e) {
                    console.error("Failed to parse incoming message:", e);
                }
            });
            
            // Remove only the messages we processed, not the entire queue
            // This prevents race conditions where new messages arrive during processing
            removeProcessedMessages(messagesToProcess.length);
        }
    }, [messageQueue, removeProcessedMessages]);

    const handleCellClick = useCallback((x: number, y: number) => {
        if (isConnected && gameboardState.gameStatus === GameStatus.InProgress) {
            sendAction({ type: "REVEAL", x, y });
        }
    }, [isConnected, gameboardState.gameStatus, sendAction]);

    const handleCellRightClick = useCallback((e: React.MouseEvent, x: number, y: number) => {
        e.preventDefault();
        if (isConnected && gameboardState.gameStatus === GameStatus.InProgress) {
            sendAction({ type: "FLAG", x, y });
        }
    }, [isConnected, gameboardState.gameStatus, sendAction]);

    // Memoize the cells render to prevent unnecessary re-renders
    const cellsRender = useMemo(() => {
        if (!gameboardState.cells || gameboardState.cells.length === 0) {
            return null;
        }

        return gameboardState.cells.map((row, xIndex) => (
            <div key={xIndex} className="game-board-row">
                {row.map((cell, yIndex) => (
                    <Cell
                        key={`${xIndex}-${yIndex}`}
                        data={cell}
                        onClick={() => handleCellClick(xIndex, yIndex)}
                        onRightClick={(e) => handleCellRightClick(e, xIndex, yIndex)}
                    />
                ))}
            </div>
        ));
    }, [gameboardState.cells, handleCellClick, handleCellRightClick]);

    // Extract game constants safely
    const gameStartTime = gameboardState.gameConstants?.gameStartTime as number | undefined;
    const gameBoardSize = gameboardState.gameConstants?.gameBoardSize as number | undefined;
    const revealReward = gameboardState.gameConstants?.revealReward as number | undefined;
    const mineHitPenalty = gameboardState.gameConstants?.mineHitPenalty as number | undefined;

    return (
        <div className="game-board-container">
            <GameStatusOverlay
                gameStartTime={gameStartTime}
                gameBoardSize={gameBoardSize}
                cellsToReveal={gameboardState.cellsToReveal}
                revealReward={revealReward}
                mineHitPenalty={mineHitPenalty}
                gameStatus={gameboardState.gameStatus}
            />
            <Scoreboard players={players} />
            {/* Game content - always rendered, not blocked by connection status */}
            {cellsRender ? (
                gameboardState.gameStatus === GameStatus.Ended ? (
                    <div className="game-over-screen">
                        <div className="game-over-message">
                            <h2>Game Over</h2>
                            <p>The game has ended</p>
                        </div>
                    </div>
                ) : (
                    <div className="game-board">
                        {cellsRender}
                    </div>
                )
            ) : (
                <div className="loading-message">
                    <p>Waiting for game board...</p>
                </div>
            )}
        </div>
    );
};

export default GameBoard;