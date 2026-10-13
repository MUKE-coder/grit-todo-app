//go:build integration

package handlers

import (
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"todo-app/apps/api/internal/fieldtypes"
	"todo-app/apps/api/internal/models"
	"todo-app/apps/api/internal/testkit"
)

func TestContact_PublicCreate(t *testing.T) {
	db := testkit.DB(t)
	handler := &ContactHandler{DB: db}
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/v1/public/contacts", handler.PublicCreate)
	client := testkit.New(t, r)

	// A legacy blank row must not cause valid, distinct emails to conflict.
	require.NoError(t, db.Create(&models.Contact{}).Error)
	for _, email := range []string{"first@example.com", "second@example.com"} {
		input := map[string]string{
			"name": "Test Contact", "email": email, "phone": "+256784143872",
		}
		client.Post("/api/v1/public/contacts", input).AssertCreated().JSON().
			Where("data.name", input["name"]).
			Where("data.email", email).
			Where("data.phone", input["phone"])

		var stored models.Contact
		require.NoError(t, db.Where("email = ?", email).First(&stored).Error)
		require.Equal(t, input["name"], stored.Name)
		require.Equal(t, input["phone"], stored.Phone)
		client.Post("/api/v1/public/contacts", input).AssertConflict()
	}

	for _, tc := range []struct {
		name string
		body map[string]string
	}{
		{name: "empty object", body: map[string]string{}},
		{name: "missing name", body: map[string]string{"email": "missing@example.com"}},
		{name: "empty name", body: map[string]string{"name": "", "email": "empty@example.com"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			testkit.New(t, r).Post("/api/v1/public/contacts", tc.body).AssertUnprocessable()
		})
	}
	var count int64
	require.NoError(t, db.Model(&models.Contact{}).Count(&count).Error)
	require.EqualValues(t, 3, count)
}

func TestContact_PublicCRUD(t *testing.T) {
	db := testkit.DB(t)
	require.NoError(t, fieldtypes.Install(db))
	handler := &ContactHandler{DB: db}
	r := gin.New()
	r.POST("/contacts", handler.PublicCreate)
	r.GET("/contacts", handler.ListPublic)
	r.GET("/contacts/:key", handler.GetPublic)
	r.PUT("/contacts/:key", handler.PublicUpdate)
	r.DELETE("/contacts/:key", handler.PublicDelete)
	client := testkit.New(t, r)
	for _, name := range []string{"First", "Second"} {
		client.Post("/contacts", map[string]string{"name": name}).AssertCreated()
	}
	var contact models.Contact
	require.NoError(t, db.Where("name = ?", "First").First(&contact).Error)
	path := "/contacts/" + contact.ID
	client.Get(path).AssertOK().JSON().Where("data.name", "First")
	input := map[string]interface{}{
		"name": "Updated", "email": "updated@example.com", "phone": "+256784143872", "profile": nil,
	}
	client.With("If-Match", "1").Put(path, input).AssertOK().JSON().Where("data.email", "updated@example.com")
	client.With("If-Match", "1").Put(path, input).AssertConflict()
	client.Get("/contacts?search=updated%40example.com").AssertOK().JSON().Count("data", 1)
	client.Put(path, map[string]string{"name": "   "}).AssertUnprocessable()
	client.Put(path, map[string]interface{}{"name": "Updated", "email": "", "phone": "", "profile": nil}).
		AssertOK().JSON().Where("data.email", "").Where("data.phone", "").Where("data.profile", nil)
	client.Delete(path).AssertOK()
	client.Get(path).AssertNotFound()
	client.Put(path, input).AssertNotFound()
	client.Delete(path).AssertNotFound()
	client.Get("/contacts").AssertOK().JSON().Count("data", 1)
}
