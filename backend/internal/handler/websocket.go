package handler

import (
	"log"
	"net/http"
	"slices"

	"github.com/gameoflife0880/web_minesweeper/backend/internal/auth"
	"github.com/gameoflife0880/web_minesweeper/backend/internal/game"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var AllowedOrigins = []string{
	"http://localhost:5173",
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")

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
	if token != "" {
		// Validate token
		claims, err := auth.ValidateToken(token)
		if err == nil {
			// Token is valid, use user ID as player ID
			playerID = claims.UserID
			log.Printf("Authenticated user connected: %s (ID: %s)", claims.Username, playerID)
		} else {
			log.Printf("Invalid token provided: %v. Creating guest connection", err)
			playerID = primitive.NewObjectID().Hex()
		}
	} else {
		// No token, create guest connection
		playerID = primitive.NewObjectID().Hex()
		log.Printf("Guest user connected: %s", playerID)
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
