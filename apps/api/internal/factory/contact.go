package factory

import (
	"fmt"
	"testing"

	"gorm.io/gorm"

	"todo-app/apps/api/internal/models"
)

// NewContact builds a valid Contact without saving it.
//
// Every call produces different values for the unique fields, so two rows made
// in the same test do not collide.
func NewContact(overrides ...func(*models.Contact)) *models.Contact {
	n := next()

	record := &models.Contact{
		Name:  fmt.Sprintf("Contact %d", n),
		Email: fmt.Sprintf("fixture-%d@example.com", n),
		Phone: fmt.Sprintf("+1415555%04d", n%10000),
	}

	for _, apply := range overrides {
		apply(record)
	}
	return record
}

// CreateContact builds one and writes it, failing the test if it will not save.
//
// Failing here rather than returning an error is deliberate: a fixture that
// cannot be created is not a test failure to be asserted on, it is a broken
// test, and the stack should point at the line that asked for it.
func CreateContact(tb testing.TB, db *gorm.DB, overrides ...func(*models.Contact)) *models.Contact {
	tb.Helper()
	record := NewContact(overrides...)
	if err := db.Create(record).Error; err != nil {
		tb.Fatalf("creating a contact fixture: %v", err)
	}
	return record
}

// CreateContacts writes n of them, for a test about paging or sorting.
func CreateContacts(tb testing.TB, db *gorm.DB, n int, overrides ...func(*models.Contact)) []*models.Contact {
	tb.Helper()
	out := make([]*models.Contact, 0, n)
	for i := 0; i < n; i++ {
		out = append(out, CreateContact(tb, db, overrides...))
	}
	return out
}
