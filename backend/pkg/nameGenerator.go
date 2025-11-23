package pkg

import (
	"fmt"
	"math/rand"
)

var adjectives = []string{
	"Wacky", "Goofy", "Silly", "Funny", "Bouncy", "Cocky", "Awkward", "Fluffy", "Sassy",
	"Clever", "Quiet", "Swift", "Calm", "Smooth", "Lucky", "Stealthy", "Chilly", "Electric",
	"Radiant", "Crispy", "Mystic", "Giant", "Ancient", "Cosmic", "Inferno", "Shadow", "Iron",
	"Galactic", "Brave", "Royal", "Crimson", "Thunder", "Vicious", "Golden", "Eternal", "Sacred",
}

var nouns = []string{
	"Robot", "System", "Byte", "Kernel", "Pixel", "Vector", "Droid", "Matrix", "Chip", "Proxy", "Raven",
	"Shark", "Viper", "Falcon", "Wolf", "Squid", "Worm", "Cloud", "Storm", "Comet", "Vortex", "Echo",
	"Nebula", "Prism", "Flame", "Whisper", "Ghost", "Stone", "Beacon", "Abyss", "Spirit", "Eblan",
}

func GenerateNickname() string {
	adjective := adjectives[rand.Intn(len(adjectives))]
	noun := nouns[rand.Intn(len(nouns))]
	number := rand.Intn(900) + 100

	return fmt.Sprintf("%s%s%d", adjective, noun, number)
}
