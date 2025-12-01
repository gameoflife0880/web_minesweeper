import { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket'; 

const GameComponent = () => {
    const { isConnected, messageQueue, sendAction, clearMessageQueue } = useWebSocket();
    
    interface GameboardState {
        cells: [],
        cellsToReveal: number,
        gameConstants: {},
    }

    const [gameboardState, setGameboardState] = useState<GameboardState>({} as GameboardState);

    useEffect(() => {
        if (messageQueue.length > 0) {
            messageQueue.forEach(message => {
                try {
                    const update = JSON.parse(message);
                    console.log(update);

                    let payload = update.payload

                    switch (update.type) {
                        case "GAMEBOARD_STATE":
                            setGameboardState({
                                cells: payload.cells,
                                cellsToReveal: payload.cellsToReveal,
                                gameConstants: payload.gameConstants,
                            });
                            break;
                        default:
                            console.log("Missing message type handler")
                    }
                } catch (e) {
                    console.error("Failed to parse incoming message:", e);
                }
            })
            clearMessageQueue();
        }
    }, [messageQueue]);

    const handleCellClick = (x: number, y: number) => {
        if (isConnected) {
            const action = { type: "REVEAL", x, y };
            sendAction(action);
        }
    };

    return (
        <>
            {isConnected ? (
                <div>
                    <h1>Minesweeper Multiplayer</h1>
                    <button onClick={() => handleCellClick(0, 0)}>
                        Reveal (0, 0)
                    </button>
                    <button onClick={() => handleCellClick(0, 1)}>
                        Reveal (0, 1)
                    </button>
                    {/* Display game state based on 'gameState' */}
                </div>
            ) : (
                <div>
                    <h1>Trying connect to server...</h1>
                </div>
            )}
        </>
    );
};

export default GameComponent;