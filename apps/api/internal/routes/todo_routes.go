package routes

import (
	"todo-app/apps/api/internal/handlers"
	"todo-app/apps/api/internal/middleware"
)

// Todos routes.
//
// This is the whole surface for todos: the handler, and every path that
// reaches it. Add a route by adding a line here. Remove the resource by
// deleting this file; nothing else refers to it.
//
// m.Public is outside the auth middleware and behind an API key, m.Protected
// takes a JWT or an API key, and m.Staff also requires the permission its
// route names (an ADMIN holds every one).
func init() {
	RegisterRoutes(func(m *Mount) {
		h := &handlers.TodoHandler{
			DB:      m.DB,
			AppName: m.Cfg.AppName,
		}

		// Read-only, outside auth, API key required.
		m.Public.GET("/todos", h.ListPublic)
		m.Public.GET("/todos/:key", h.GetPublic)
		m.Staff.POST("/todos", h.Create)

		m.Staff.GET("/todos", middleware.RequireRole("ADMIN", "perm:todos.view"), h.List)
		m.Staff.GET("/todos/export", middleware.RequireRole("ADMIN", "perm:todos.view"), h.Export)
		m.Staff.POST("/todos/import", middleware.RequireRole("ADMIN", "perm:todos.create"), h.Import)
		m.Staff.GET("/todos/import/template", middleware.RequireRole("ADMIN", "perm:todos.view"), h.Template)
		m.Staff.GET("/todos/:id", middleware.RequireRole("ADMIN", "perm:todos.view"), h.GetByID)
		m.Staff.GET("/todos/:id/pdf", middleware.RequireRole("ADMIN", "perm:todos.view"), h.PDF)
		// m.Staff.POST("/todos", middleware.RequireRole("ADMIN", "perm:todos.create"), h.Create)
		m.Staff.POST("/todos/bulk-create", middleware.RequireRole("ADMIN", "perm:todos.create"), h.BulkCreate)
		m.Staff.PUT("/todos/:id", middleware.RequireRole("ADMIN", "perm:todos.edit"), h.Update)
		m.Staff.PATCH("/todos/:id", middleware.RequireRole("ADMIN", "perm:todos.edit"), h.Patch)
		m.Staff.POST("/todos/bulk-edit", middleware.RequireRole("ADMIN", "perm:todos.edit"), h.BulkEdit)

		m.Staff.DELETE("/todos/:id", middleware.RequireRole("ADMIN", "perm:todos.delete"), h.Delete)
		m.Staff.POST("/todos/bulk", middleware.RequireRole("ADMIN", "perm:todos.delete"), h.Bulk)
	})
}
