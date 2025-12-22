package auth

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token     string    `json:"token"`
	User      *User     `json:"user"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

// RegisterHandler handles user registration
func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	if req.Username == "" || req.Password == "" {
		respondWithError(w, http.StatusBadRequest, "Username and password are required")
		return
	}

	// Create user
	user, err := CreateUser(req.Username, req.Email, req.Password)
	if err != nil {
		if err == ErrUserExists {
			respondWithError(w, http.StatusConflict, "User already exists")
			return
		}
		log.Printf("Error creating user: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	// Generate token
	token, err := GenerateToken(user.ID.Hex(), user.Username)
	if err != nil {
		log.Printf("Error generating token: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	respondWithAuth(w, http.StatusCreated, token, user)
}

// LoginHandler handles user login
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	if req.Username == "" || req.Password == "" {
		respondWithError(w, http.StatusBadRequest, "Username and password are required")
		return
	}

	// Authenticate user
	user, err := AuthenticateUser(req.Username, req.Password)
	if err != nil {
		if err == ErrInvalidCredentials {
			respondWithError(w, http.StatusUnauthorized, "Invalid credentials")
			return
		}
		log.Printf("Error authenticating user: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Authentication failed")
		return
	}

	// Generate token
	token, err := GenerateToken(user.ID.Hex(), user.Username)
	if err != nil {
		log.Printf("Error generating token: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	respondWithAuth(w, http.StatusOK, token, user)
}

// VerifyTokenHandler verifies if a token is valid
func VerifyTokenHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := r.URL.Query().Get("token")
	if token == "" {
		// Try Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			token = authHeader[7:]
		}
	}

	if token == "" {
		respondWithError(w, http.StatusBadRequest, "Token is required")
		return
	}

	claims, err := ValidateToken(token)
	if err != nil {
		if err == ErrExpiredToken {
			respondWithError(w, http.StatusUnauthorized, "Token has expired")
			return
		}
		respondWithError(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	// Get user info
	user, err := GetUserByID(claims.UserID)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "User not found")
		return
	}

	respondWithAuth(w, http.StatusOK, token, user)
}

func respondWithError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}

func respondWithAuth(w http.ResponseWriter, statusCode int, token string, user *User) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	expiresAt := time.Now().Add(24 * time.Hour)
	json.NewEncoder(w).Encode(AuthResponse{
		Token:     token,
		User:      user,
		ExpiresAt: expiresAt,
	})
}
