package game

import (
	"math/rand"
)

func GenerateGameBoard() *GameBoard {
	cells := make([][]Cell, GAMEBOARD_SIZE)

	for i := range cells {
		cells[i] = make([]Cell, GAMEBOARD_SIZE)
	}

	gameBoard := &GameBoard{
		Cells:         cells,
		CellsToReveal: GAMEBOARD_SIZE * GAMEBOARD_SIZE,
	}

	minesSpawned := 0
	for i := range GAMEBOARD_SIZE {
		for j := range GAMEBOARD_SIZE {
			if randVal := rand.Intn(100); randVal < int(MINES_MULTIPLIER*100) {
				gameBoard.Cells[i][j].IsMine = true
				minesSpawned++
			}
		}
	}

	gameBoard.CellsToReveal -= minesSpawned

	for i := range GAMEBOARD_SIZE {
		for j := range GAMEBOARD_SIZE {
			gameBoard.Cells[i][j].AdjacentMines = CalculateAdjacentMines(gameBoard, i, j)
		}
	}

	return gameBoard
}

func CalculateAdjacentMines(gameBoard *GameBoard, x int, y int) int {
	mineCount := 0

	for oX := -1; oX <= 1; oX++ {
		for oY := -1; oY <= 1; oY++ {
			if oX == 0 && oY == 0 {
				continue
			}

			neighborX := x + oX
			neighborY := y + oY

			isOnBoard := neighborX >= 0 && neighborX < GAMEBOARD_SIZE && neighborY >= 0 && neighborY < GAMEBOARD_SIZE
			if isOnBoard {
				if gameBoard.Cells[neighborX][neighborY].IsMine {
					mineCount++
				}
			}
		}
	}

	return mineCount
}
