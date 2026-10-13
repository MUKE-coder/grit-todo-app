package factory

import (
	"fmt"
	"testing"

	"gorm.io/gorm"

	"todo-app/apps/api/internal/models"
)

// NewTodo builds a valid Todo without saving it.
//
// Every call produces different values for the unique fields, so two rows made
// in the same test do not collide.
func NewTodo(overrides ...func(*models.Todo)) *models.Todo {
	n := next()

	record := &models.Todo{
		Title:     fmt.Sprintf("Todo %d", n),
		Completed: true,
	}

	for _, apply := range overrides {
		apply(record)
	}
	return record
}

// CreateTodo builds one and writes it, failing the test if it will not save.
//
// Failing here rather than returning an error is deliberate: a fixture that
// cannot be created is not a test failure to be asserted on, it is a broken
// test, and the stack should point at the line that asked for it.
func CreateTodo(tb testing.TB, db *gorm.DB, overrides ...func(*models.Todo)) *models.Todo {
	tb.Helper()
	record := NewTodo(overrides...)
	if err := db.Create(record).Error; err != nil {
		tb.Fatalf("creating a todo fixture: %v", err)
	}
	return record
}

// CreateTodos writes n of them, for a test about paging or sorting.
func CreateTodos(tb testing.TB, db *gorm.DB, n int, overrides ...func(*models.Todo)) []*models.Todo {
	tb.Helper()
	out := make([]*models.Todo, 0, n)
	for i := 0; i < n; i++ {
		out = append(out, CreateTodo(tb, db, overrides...))
	}
	return out
}
