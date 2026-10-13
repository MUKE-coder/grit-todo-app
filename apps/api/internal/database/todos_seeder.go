package database

import (
	"github.com/brianvoe/gofakeit/v7"
	"gorm.io/gorm"
	"todo-app/apps/api/internal/models"
)

// SeedTodos tops todos up to 10 fake rows. It is what
// "grit seed" runs; "grit seed Todo --count N" runs SeedTodosTo with any
// other target.
func SeedTodos(db *gorm.DB) error {
	return SeedTodosTo(db, 10)
}

func init() {
	RegisterSeeder("Todo", SeedTodosTo, "todos", "todos")
}

// SeedTodosTo tops todos up to target rows. It counts what is there and
// inserts only the rest, in batches, so running it twice does nothing the second
// time and a run that stopped partway resumes where it stopped. Row i is the
// row's number in the table, which keeps a unique column unique however many
// rows are asked for. Swap the gofakeit calls for your own values.
func SeedTodosTo(db *gorm.DB, target int64) error {
	return SeedTopUp(db, "todos", SeedPlan[models.Todo]{
		Target: target,
		Make: func(n int64) models.Todo {
			return models.Todo{
				Title:     gofakeit.Sentence(6),
				Completed: gofakeit.Bool(),
			}
		},
	})
}
