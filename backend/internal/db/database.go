package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	Client   *mongo.Client
	Database *mongo.Database
)

const (
	DefaultMongoURI   = "mongodb://localhost:27017"
	DefaultDatabase   = "minesweeper"
	ConnectionTimeout = 10 * time.Second
)

// Init initializes the MongoDB connection
func Init(mongoURI, databaseName string) error {
	if mongoURI == "" {
		mongoURI = DefaultMongoURI
	}
	if databaseName == "" {
		databaseName = DefaultDatabase
	}

	ctx, cancel := context.WithTimeout(context.Background(), ConnectionTimeout)
	defer cancel()

	clientOptions := options.Client().ApplyURI(mongoURI)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return err
	}

	// Ping the database to verify connection
	if err := client.Ping(ctx, nil); err != nil {
		return err
	}

	Client = client
	Database = client.Database(databaseName)

	log.Printf("Connected to MongoDB: %s, Database: %s", mongoURI, databaseName)
	return nil
}

// Close closes the MongoDB connection
func Close() error {
	if Client != nil {
		ctx, cancel := context.WithTimeout(context.Background(), ConnectionTimeout)
		defer cancel()
		return Client.Disconnect(ctx)
	}
	return nil
}
