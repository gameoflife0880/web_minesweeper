package handler

import (
	"log"
	"net/http"
	"slices"

	"github.com/gameoflife0880/web_minesweeper/backend/internal/game"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AllowedOrigins defines the list of allowed origins for WebSocket connections
var AllowedOrigins = []string{
	"http://localhost:3000",
	"http://localhost:5173",
	"chrome-extension://gobngblklhkgmjhbpbdlkglbhhlafjnh",
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		log.Printf("Request from an Origin: %s", origin)

		// Check against allowed origins
		return slices.Contains(AllowedOrigins, origin)
	},
}

func ServeWs(hub *game.GameHub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	var playerID string

	token := r.URL.Query().Get("token")
	if token == "" {
		playerID = primitive.NewObjectID().Hex()
		log.Printf("Unauthorized. New guest connected")
	} else {
		// Token validation logic
		// For now, if token is provided but validation fails, generate a new guest ID
		// TODO: Implement proper token validation
		playerID = primitive.NewObjectID().Hex()
		log.Printf("Token provided but validation not implemented. New guest connected")
	}

	client := &game.Client{
		Hub:      hub,
		Conn:     conn,
		Send:     make(chan []byte, 256),
		PlayerID: playerID,
	}

	hub.Register <- client

	go client.ReadPump()
	go client.WritePump()
}
