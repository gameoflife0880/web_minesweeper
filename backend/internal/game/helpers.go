package game

// newUpdateResult creates a new empty UpdateResult with initialized slices
func newUpdateResult() *UpdateResult {
	return &UpdateResult{
		CellUpdates:       make([]CellAction, 0),
		ScoreboardUpdates: make([]ScoreboardAction, 0),
	}
}

// toMap converts UpdateResult to the legacy map format for backward compatibility
// This allows gradual migration from map[string][]any to the type-safe UpdateResult
func (u *UpdateResult) toMap() map[string][]any {
	result := make(map[string][]any)
	if len(u.CellUpdates) > 0 {
		cellUpdates := make([]any, len(u.CellUpdates))
		for i, v := range u.CellUpdates {
			cellUpdates[i] = v
		}
		result["cellUpdates"] = cellUpdates
	}
	if len(u.ScoreboardUpdates) > 0 {
		scoreboardUpdates := make([]any, len(u.ScoreboardUpdates))
		for i, v := range u.ScoreboardUpdates {
			scoreboardUpdates[i] = v
		}
		result["scoreboardUpdates"] = scoreboardUpdates
	}
	return result
}

// isValidCoordinate checks if coordinates are within board bounds
func isValidCoordinate(x, y int) bool {
	return x >= 0 && x < GAMEBOARD_SIZE && y >= 0 && y < GAMEBOARD_SIZE
}

// calculateScore calculates the score increment for revealing a cell based on adjacent mines
func calculateScore(adjacentMines int) int {
	return REVEAL_REWARD + adjacentMines
}

// applyScorePenalty applies a penalty to a player's score, ensuring it doesn't go below 0
func applyScorePenalty(player *Player, penalty int) {
	if player.Score > penalty {
		player.Score -= penalty
	} else {
		player.Score = 0
	}
}
