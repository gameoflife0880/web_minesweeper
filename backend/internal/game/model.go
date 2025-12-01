package game

import (
	"sync"

	"github.com/gorilla/websocket"
)

type GameConstants struct {
	GameStartTime      int64   `json:"gameStartTime"`
	GameBoardSize      int     `json:"gameBoardSize"`
	MinesMultiplier    float32 `json:"minesMultiplier"`
	RevealReward       int     `json:"revealReward"`
	FlagValidateReward int     `json:"flagValidateReward"`
	FlagBadPenalty     int     `json:"flagBadPenalty"`
	MineHitPenalty     int     `json:"mineHitPenalty"`
	ActiveFlagLimit    int     `json:"activeFlagLimit"`
}

type GameHub struct {
	GameBoard GameBoard
	Clients   map[string]*Client
	Players   map[string]*Player

	BoardLock sync.RWMutex

	Register          chan *Client
	Unregister        chan *Client
	CellActionChannel chan CellAction
	Broadcast         chan []byte

	StartTime  int64
	GameStatus GameStatus

	// Shutdown channel for graceful shutdown
	shutdown chan struct{}
}

type GameBoard struct {
	Cells         [][]Cell      `json:"cells"`
	CellsToReveal int           `json:"cellsToReveal"`
	GameConstants GameConstants `json:"gameConstants"`
}

type Client struct {
	Hub      *GameHub
	Conn     *websocket.Conn
	Send     chan []byte
	PlayerID string
}

type Player struct {
	PlayerID        string `json:"playerID"`
	PlayerName      string `json:"playerName"`
	Score           int    `json:"score"`
	TotalDefuses    int    `json:"totalDefuses"`
	TotalMineHits   int    `json:"totalMineHits"`
	ActiveFlagCount int    `json:"activeFlagCount"`
	IsLoggedIn      bool   `json:"isLoggedIn"`
}

type Cell struct {
	IsRevealed    bool
	IsMine        bool
	AdjacentMines int
	FlagState     FlagState
	FlagOwnerID   string
}

type WebsocketAction struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}

type CellAction struct {
	Type     string `json:"type"`
	X        int    `json:"x"`
	Y        int    `json:"y"`
	PlayerID string `json:"playerID"`
	Cell     Cell   `json:"cell"`
}

type ScoreboardAction struct {
	Type     string `json:"type"`
	Value    int    `json:"value"`
	PlayerID string `json:"playerID"`
	Player   Player `json:"player"`
}

type UpdateResult struct {
	CellUpdates       []CellAction
	ScoreboardUpdates []ScoreboardAction
}

type FlagState int

const (
	Empty FlagState = iota
	Placed
	Validated
)

type GameStatus int

const (
	InProgress GameStatus = iota
	Ended
)
