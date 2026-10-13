package routes

import (
	"todo-app/apps/api/internal/handlers"
	"todo-app/apps/api/internal/middleware"
)

// Contacts routes.
//
// This is the whole surface for contacts: the handler, and every path that
// reaches it. Add a route by adding a line here. Remove the resource by
// deleting this file; nothing else refers to it.
//
// m.Public is outside the auth middleware and behind an API key, m.Protected
// takes a JWT or an API key, and m.Staff also requires the permission its
// route names (an ADMIN holds every one).
func init() {
	RegisterRoutes(func(m *Mount) {
		h := &handlers.ContactHandler{
			DB:      m.DB,
			AppName: m.Cfg.AppName,
			Storage: m.Svc.Storage,
		}

		// Public directory CRUD, outside user auth; API key required.
		m.Public.GET("/contacts", h.ListPublic)
		m.Public.GET("/contacts/:key", h.GetPublic)
		m.Public.POST("/contacts", h.PublicCreate)
		m.Public.PUT("/contacts/:key", h.PublicUpdate)
		m.Public.DELETE("/contacts/:key", h.PublicDelete)

		m.Staff.GET("/contacts", middleware.RequireRole("ADMIN", "perm:contacts.view"), h.List)
		m.Staff.GET("/contacts/export", middleware.RequireRole("ADMIN", "perm:contacts.view"), h.Export)
		m.Staff.POST("/contacts/import", middleware.RequireRole("ADMIN", "perm:contacts.create"), h.Import)
		m.Staff.GET("/contacts/import/template", middleware.RequireRole("ADMIN", "perm:contacts.view"), h.Template)
		m.Staff.GET("/contacts/:id", middleware.RequireRole("ADMIN", "perm:contacts.view"), h.GetByID)
		m.Staff.GET("/contacts/:id/pdf", middleware.RequireRole("ADMIN", "perm:contacts.view"), h.PDF)
		m.Staff.POST("/contacts", middleware.RequireRole("ADMIN", "perm:contacts.create"), h.Create)
		m.Staff.POST("/contacts/bulk-create", middleware.RequireRole("ADMIN", "perm:contacts.create"), h.BulkCreate)
		m.Staff.PUT("/contacts/:id", middleware.RequireRole("ADMIN", "perm:contacts.edit"), h.Update)
		m.Staff.PATCH("/contacts/:id", middleware.RequireRole("ADMIN", "perm:contacts.edit"), h.Patch)
		m.Staff.POST("/contacts/bulk-edit", middleware.RequireRole("ADMIN", "perm:contacts.edit"), h.BulkEdit)

		m.Staff.DELETE("/contacts/:id", middleware.RequireRole("ADMIN", "perm:contacts.delete"), h.Delete)
		m.Staff.POST("/contacts/bulk", middleware.RequireRole("ADMIN", "perm:contacts.delete"), h.Bulk)
	})
}
