package game

func newUpdateResult() *UpdateResult {
	return &UpdateResult{
		CellUpdates:       make([]CellAction, 0),
		ScoreboardUpdates: make([]ScoreboardAction, 0),
	}
}

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

func isValidCoordinate(x, y int) bool {
	return x >= 0 && x < GAMEBOARD_SIZE && y >= 0 && y < GAMEBOARD_SIZE
}

func calculateScore(adjacentMines int) int {
	return REVEAL_REWARD + adjacentMines
}

func applyScorePenalty(player *Player, penalty int) {
	if player.Score > penalty {
		player.Score -= penalty
	} else {
		player.Score = 0
	}
}

// removeFlagIfPresent removes a flag from a cell when it's being revealed
// and updates the flag owner's activeFlagCount if needed
func removeFlagIfPresent(h *GameHub, cell *Cell, updates *UpdateResult) {
	if cell.FlagState == Placed && cell.FlagOwnerID != "" {
		flagOwner, exists := h.Players[cell.FlagOwnerID]
		if exists && flagOwner.ActiveFlagCount > 0 {
			flagOwner.ActiveFlagCount -= 1
			updates.ScoreboardUpdates = append(updates.ScoreboardUpdates, ScoreboardAction{
				Type:     "FLAG_DECREMENT",
				PlayerID: cell.FlagOwnerID,
			})
		}
		cell.FlagState = Empty
		cell.FlagOwnerID = ""
	}
}
