// Example: updated Zustand store structure
import { create } from 'zustand';

interface GameState {
    gameBoard: Object,
    handleUpdates: (update: Object) => void
}

export const useGameStore = create<GameState>((set) => ({
  // Define your initial board state, e.g., a 2D array or a map
  gameBoard: {},

  handleUpdates: (message: any) => set((state: any) => {
    
    // 1. Message Routing
    if (message.type === "CELL") {
      const cellUpdates = message.payload;
      
      // 2. Efficient State Merging
      // Use the spread operator to create a new board object
      // and merge the received cell updates into it.
      const newBoard = { 
        ...state.board, 
        ...cellUpdates 
      };
      
      return { board: newBoard };
    } 
    
    // Handle other types of messages (e.g., PLAYER, SCORE) here
    if (message.type === "PLAYER") {
        // ... state logic for player updates
    }

    return state; // Return current state if the message type is not handled
  }),

  // ... other actions
}));