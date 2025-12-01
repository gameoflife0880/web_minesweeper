import { useEffect, useState, useCallback, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import Cell, { type CellData } from './Cell';
import './GameBoard.css';

interface GameboardState {
    cells: CellData[][];
    cellsToReveal: number;
    gameConstants: Record<string, unknown>;
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

type GameStatus = 'in_progress' | 'ended';

const GameBoard = () => {
    const { isConnected, messageQueue, sendAction, removeProcessedMessages } = useWebSocket();

    const [gameboardState, setGameboardState] = useState<GameboardState>({} as GameboardState);
    const [gameStatus, setGameStatus] = useState<GameStatus>('in_progress');

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
                            // Handle game status updates
                            if (payload?.status === "ended" || payload?.status === "in_progress") {
                                setGameStatus(payload.status);
                            }
                            break;
                        case "GAMEBOARD_STATE":
                            setGameboardState({
                                cells: payload.cells,
                                cellsToReveal: payload.cellsToReveal,
                                gameConstants: payload.gameConstants,
                            });
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

                                    // Apply each cell update
                                    payload.cellUpdates.forEach((cellUpdate: CellUpdate) => {
                                        const { x, y, cell } = cellUpdate;
                                        
                                        // Validate coordinates
                                        if (
                                            x >= 0 && 
                                            x < newCells.length && 
                                            y >= 0 && 
                                            y < newCells[x]?.length
                                        ) {
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

                                    return {
                                        ...prevState,
                                        cells: newCells,
                                    };
                                });
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
        if (isConnected && gameStatus === 'in_progress') {
            sendAction({ type: "REVEAL", x, y });
        }
    }, [isConnected, gameStatus, sendAction]);

    const handleCellRightClick = useCallback((e: React.MouseEvent, x: number, y: number) => {
        e.preventDefault();
        if (isConnected && gameStatus === 'in_progress') {
            sendAction({ type: "FLAG", x, y });
        }
    }, [isConnected, gameStatus, sendAction]);

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

    return (
        <>
            {isConnected ? (
                <div className="game-board-container">
                    {cellsRender ? (
                        <>
                            <div className="game-board">
                                {cellsRender}
                            </div>
                            {gameStatus === 'ended' && (
                                <div className="game-over-overlay">
                                    <div className="game-over-message">
                                        <h2>Game Over</h2>
                                        <p>The game has ended</p>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="loading-message">
                            <p>Waiting for game board...</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="connection-message">
                    <h1>Connecting to server...</h1>
                </div>
            )}
        </>
    );
};

export default GameBoard;