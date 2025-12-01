package game

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gameoflife0880/web_minesweeper/backend/pkg"
)

func NewGameHub() *GameHub {
	gameBoard := GenerateGameBoard()

	hub := &GameHub{
		GameBoard: *gameBoard,
		Clients:   make(map[string]*Client),
		Players:   make(map[string]*Player),

		Register:          make(chan *Client),
		Unregister:        make(chan *Client),
		CellActionChannel: make(chan CellAction),
		Broadcast:         make(chan []byte, 256), // Buffered to prevent blocking
		RestartTimer:      make(chan struct{}),

		StartTime:   time.Now().Unix(),
		GameStatus:  InProgress,
		RestartTime: 0,
		shutdown:    make(chan struct{}),
	}

	return hub
}

func (h *GameHub) Run() {
	defer func() {
		log.Println("GameHub stopped")
	}()

	for {
		select {
		case <-h.shutdown:
			return
		case client := <-h.Register:
			h.BoardLock.Lock()
			h.Clients[client.PlayerID] = client
			h.Players[client.PlayerID] = &Player{
				PlayerID:   client.PlayerID,
				PlayerName: pkg.GenerateNickname(),
			}

			scoreboardUpdates := map[string]ScoreboardAction{
				"scoreboardUpdates": {
					Type:   "REGISTER",
					Player: *h.Players[client.PlayerID],
				},
			}
			h.BroadcastUpdates("REGISTER", scoreboardUpdates)

			payload := h.GetGameBoardState()
			gameBoardState := map[string]any{
				"type":    "GAMEBOARD_STATE",
				"payload": payload,
			}
			if jsonGameBoardState, err := json.Marshal(gameBoardState); err != nil {
				log.Printf("Failed to marshal game board state for player %s: %v", client.PlayerID, err)
			} else {
				select {
				case client.Send <- jsonGameBoardState:
				default:
					log.Printf("Failed to send game board state to player %s: channel full", client.PlayerID)
				}
			}
			h.BoardLock.Unlock()
			log.Printf("Player %s joined. Total players: %d", client.PlayerID, len(h.Players))
		case client := <-h.Unregister:
			h.BoardLock.Lock()
			if _, ok := h.Clients[client.PlayerID]; ok {
				if player, playerExists := h.Players[client.PlayerID]; playerExists {
					scoreboardUpdates := map[string]ScoreboardAction{
						"scoreboardUpdates": {
							Type:   "UNREGISTER",
							Player: *player,
						},
					}

					h.BroadcastUpdates("UNREGISTER", scoreboardUpdates)
				}

				delete(h.Players, client.PlayerID)
				delete(h.Clients, client.PlayerID)
				close(client.Send)
			}
			h.BoardLock.Unlock()
			log.Printf("Player %s left. Total players: %d", client.PlayerID, len(h.Players))
		case cellAction := <-h.CellActionChannel:
			if h.GameStatus != InProgress {
				continue
			}
			h.BoardLock.Lock()
			updates := h.HandleCellAction(cellAction)
			h.BroadcastUpdates("CELL", updates)

			h.CheckWinCondition()

			h.BoardLock.Unlock()
		case message := <-h.Broadcast:
			h.BoardLock.RLock()
			clients := make([]*Client, 0, len(h.Clients))
			for _, c := range h.Clients {
				clients = append(clients, c)
			}
			h.BoardLock.RUnlock()

			for _, c := range clients {
				select {
				case c.Send <- message:
				default:
					log.Printf("Failed to send message to %s", c.PlayerID)
					select {
					case h.Unregister <- c:
					default:
						log.Printf("Failed to unregister client %s: channel full", c.PlayerID)
					}
				}
			}
		case <-h.RestartTimer:
			h.BoardLock.Lock()
			h.RestartGame()
			h.BoardLock.Unlock()
		}
	}
}

func (h *GameHub) BroadcastUpdates(actionType string, payload any) {
	if actionType == "" || payload == nil {
		return
	}

	jsonUpdates, err := json.Marshal(map[string]any{
		"type":    actionType,
		"payload": payload,
	})
	if err != nil {
		log.Printf("BroadcastUpdates: failed to marshal updates: %v", err)
		return
	}

	select {
	case h.Broadcast <- jsonUpdates:
	default:
		log.Printf("BroadcastUpdates: channel full, dropping message type: %s", actionType)
	}
}

func (h *GameHub) HandleCellAction(action CellAction) map[string][]any {
	if !isValidCoordinate(action.X, action.Y) {
		return map[string][]any{
			"outOfBoard": nil,
		}
	}

	var updates *UpdateResult

	switch action.Type {
	case "REVEAL":
		updates = h.CellReveal(action.X, action.Y, action.PlayerID)
	case "FLAG":
		updates = h.CellFlag(action.X, action.Y, action.PlayerID)
	default:
		return newUpdateResult().toMap()
	}

	if updates == nil {
		return newUpdateResult().toMap()
	}

	return updates.toMap()
}

func (h *GameHub) CellReveal(x int, y int, playerID string) *UpdateResult {
	if h.GameBoard.Cells[x][y].IsRevealed {
		return nil
	}

	player, exists := h.Players[playerID]
	if !exists {
		return newUpdateResult()
	}

	if h.GameBoard.Cells[x][y].IsMine {
		return h.handleMineHit(x, y, playerID, player)
	}

	return h.CellFloodReveal(x, y, playerID)
}

func (h *GameHub) handleMineHit(x, y int, playerID string, player *Player) *UpdateResult {
	updates := newUpdateResult()

	cell := &h.GameBoard.Cells[x][y]

	// Remove flag if present before revealing
	removeFlagIfPresent(h, cell, updates)

	cell.IsRevealed = true

	player.TotalMineHits += 1
	applyScorePenalty(player, MINE_HIT_PENALTY)

	updates.CellUpdates = append(updates.CellUpdates, CellAction{
		Type:     "HIT",
		X:        x,
		Y:        y,
		PlayerID: playerID,
		Cell:     *cell,
	})
	updates.ScoreboardUpdates = append(updates.ScoreboardUpdates, ScoreboardAction{
		Type:     "SCORE",
		Value:    -MINE_HIT_PENALTY,
		PlayerID: playerID,
	})
	updates.ScoreboardUpdates = append(updates.ScoreboardUpdates, ScoreboardAction{
		Type:     "MINE_HIT_INCREMENT",
		PlayerID: playerID,
	})

	return updates
}

func (h *GameHub) CellFloodReveal(x int, y int, playerID string) *UpdateResult {
	updates := newUpdateResult()

	if !isValidCoordinate(x, y) || h.GameBoard.Cells[x][y].IsRevealed || h.GameBoard.Cells[x][y].IsMine {
		return updates
	}

	player, exists := h.Players[playerID]
	if !exists {
		return updates
	}

	queue := [][]int{{x, y}}
	scoreIncrement := 0

	cell := &h.GameBoard.Cells[x][y]

	// Remove flag if present before revealing
	removeFlagIfPresent(h, cell, updates)

	cell.IsRevealed = true
	if h.GameBoard.CellsToReveal > 0 {
		h.GameBoard.CellsToReveal -= 1
	}
	score := calculateScore(cell.AdjacentMines)
	player.Score += score
	scoreIncrement += score

	updates.CellUpdates = append(updates.CellUpdates, CellAction{
		Type:     "REVEALED",
		X:        x,
		Y:        y,
		PlayerID: playerID,
		Cell:     *cell,
	})

	for len(queue) > 0 {
		cell := queue[0]
		queue = queue[1:]
		cellX, cellY := cell[0], cell[1]

		if h.GameBoard.Cells[cellX][cellY].AdjacentMines == 0 {
			for oX := -1; oX <= 1; oX++ {
				for oY := -1; oY <= 1; oY++ {
					if oX == 0 && oY == 0 {
						continue
					}
					neighborX := cellX + oX
					neighborY := cellY + oY

					if isValidCoordinate(neighborX, neighborY) &&
						!h.GameBoard.Cells[neighborX][neighborY].IsRevealed &&
						!h.GameBoard.Cells[neighborX][neighborY].IsMine {
						neighborCell := &h.GameBoard.Cells[neighborX][neighborY]

						// Remove flag if present before revealing
						removeFlagIfPresent(h, neighborCell, updates)

						neighborCell.IsRevealed = true
						if h.GameBoard.CellsToReveal > 0 {
							h.GameBoard.CellsToReveal -= 1
						}
						score := calculateScore(neighborCell.AdjacentMines)
						player.Score += score
						scoreIncrement += score

						updates.CellUpdates = append(updates.CellUpdates, CellAction{
							Type:     "REVEALED",
							X:        neighborX,
							Y:        neighborY,
							PlayerID: playerID,
							Cell:     *neighborCell,
						})

						if neighborCell.AdjacentMines == 0 {
							queue = append(queue, []int{neighborX, neighborY})
						}
					}
				}
			}
		}
	}

	if scoreIncrement > 0 {
		updates.ScoreboardUpdates = append(updates.ScoreboardUpdates, ScoreboardAction{
			Type:     "SCORE",
			Value:    scoreIncrement,
			PlayerID: playerID,
		})
	}

	return updates
}

func (h *GameHub) CellFlag(x int, y int, playerID string) *UpdateResult {
	if !isValidCoordinate(x, y) {
		return nil
	}

	if h.GameBoard.Cells[x][y].IsRevealed {
		return nil
	}

	player, exists := h.Players[playerID]
	if !exists {
		return newUpdateResult()
	}

	updates := newUpdateResult()
	cell := &h.GameBoard.Cells[x][y]

	switch cell.FlagState {
	case Empty:
		cell.FlagState = Placed
		cell.FlagOwnerID = playerID
		player.ActiveFlagCount += 1
		updates.ScoreboardUpdates = append(updates.ScoreboardUpdates, ScoreboardAction{
			Type:     "FLAG_INCREMENT",
			PlayerID: playerID,
		})
	case Placed:
		if cell.FlagOwnerID != playerID {
			return updates
		}
		cell.FlagState = Empty
		cell.FlagOwnerID = ""
		player.ActiveFlagCount -= 1
		updates.ScoreboardUpdates = append(updates.ScoreboardUpdates, ScoreboardAction{
			Type:     "FLAG_DECREMENT",
			PlayerID: playerID,
		})
	default:
		return updates
	}

	updates.CellUpdates = append(updates.CellUpdates, CellAction{
		Type:     "FLAG",
		X:        x,
		Y:        y,
		PlayerID: playerID,
		Cell:     *cell,
	})

	return updates
}

func (h *GameHub) GetGameBoardState() *GameBoard {
	gameBoardState := &GameBoard{}
	cells := make([][]Cell, GAMEBOARD_SIZE)

	for i := range cells {
		cells[i] = make([]Cell, GAMEBOARD_SIZE)
	}

	for i := range GAMEBOARD_SIZE {
		for j := range GAMEBOARD_SIZE {
			if h.GameBoard.Cells[i][j].IsRevealed {
				cells[i][j] = h.GameBoard.Cells[i][j]
			} else {
				if h.GameBoard.Cells[i][j].FlagState != Empty {
					cells[i][j].FlagState = h.GameBoard.Cells[i][j].FlagState
				}
			}
		}
	}

	gameBoardState.GameConstants = GameConstants{
		GameStartTime:   h.StartTime,
		GameBoardSize:   GAMEBOARD_SIZE,
		MinesMultiplier: MINES_MULTIPLIER,
		RevealReward:    REVEAL_REWARD,
		MineHitPenalty:  MINE_HIT_PENALTY,
	}
	gameBoardState.Cells = cells
	gameBoardState.CellsToReveal = h.GameBoard.CellsToReveal
	gameBoardState.GameStatus = h.GameStatus
	gameBoardState.RestartTime = h.RestartTime

	players := make([]Player, 0, len(h.Players))
	for _, player := range h.Players {
		players = append(players, *player)
	}
	gameBoardState.Players = players

	return gameBoardState
}

func (h *GameHub) CheckWinCondition() {
	if h.GameBoard.CellsToReveal == 0 {
		h.GameStatus = Ended
		restartTime := time.Now().Unix() + 30
		h.RestartTime = restartTime
		h.BroadcastUpdates("GAME_STATUS", map[string]GameStatus{
			"gameStatus": Ended,
		})

		log.Println("Game ended, will restart in 30 seconds")

		go func() {
			time.Sleep(30 * time.Second)
			select {
			case h.RestartTimer <- struct{}{}:
			default:
				log.Println("RestartTimer channel full, skipping restart")
			}
		}()
	}
}

func (h *GameHub) RestartGame() {
	gameBoard := GenerateGameBoard()
	h.GameBoard = *gameBoard

	h.GameStatus = InProgress
	h.StartTime = time.Now().Unix()
	h.RestartTime = 0

	for _, player := range h.Players {
		player.Score = 0
		player.TotalMineHits = 0
		player.ActiveFlagCount = 0
	}

	log.Println("Game restarted")

	payload := h.GetGameBoardState()
	h.BroadcastUpdates("GAMEBOARD_STATE", payload)
}

func (h *GameHub) Shutdown() chan struct{} {
	return h.shutdown
}
