package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gameoflife0880/web_minesweeper/backend/internal/auth"
	"github.com/gameoflife0880/web_minesweeper/backend/internal/db"
	"github.com/gameoflife0880/web_minesweeper/backend/internal/game"
	"github.com/gameoflife0880/web_minesweeper/backend/internal/handler"
)

const PORT = "8081"

func main() {
	// Initialize database connection
	mongoURI := os.Getenv("MONGO_URI")
	if err := db.Init(mongoURI, ""); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	hub := game.NewGameHub()

	go hub.Run()

	// Auth routes
	http.HandleFunc("/api/auth/register", auth.RegisterHandler)
	http.HandleFunc("/api/auth/login", auth.LoginHandler)
	http.HandleFunc("/api/auth/verify", auth.VerifyTokenHandler)

	// WebSocket route
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handler.ServeWs(hub, w, r)
	})

	server := &http.Server{
		Addr:    ":" + PORT,
		Handler: nil,
	}

	go func() {
		log.Printf("Starting HTTP server on: %s", PORT)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	close(hub.Shutdown())

	log.Println("Server exited")
}
