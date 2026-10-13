package services

import (
	"context"
	// Grid rows arrive as maps and are decoded into the model here, through
	// the same JSON path a single create takes.
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"todo-app/apps/api/internal/authz"
	"todo-app/apps/api/internal/concurrency"
	"todo-app/apps/api/internal/models"
	"todo-app/apps/api/internal/paginate"
	"todo-app/apps/api/internal/respond"
)

// TodoService owns every database read and write for todos.
//
// The handler reads the request, calls one of these and writes the answer. A
// job, a command or a test calls the same methods with no request at all, so a
// rule enforced here is enforced everywhere, not only on the HTTP route.
//
// Each method takes the context it runs in. It carries the organization the
// multitenant plugin resolved, the actor ownership is scoped by (see
// authz.WithActor, and authz.AsSystem for a job), and the cancellation that
// fires when a client goes away.
type TodoService struct {
	DB *gorm.DB
}

// todoListConfig is what a client may search, sort and filter todos
// by. Whitelisted, because each name ends up in SQL.
var todoListConfig = paginate.Config{
	Searchable: []string{"title"},
	Sortable:   map[string]bool{"id": true, "created_at": true, "title": true},
	Filterable: map[string]bool{"id": true, "title": true, "completed": true},
}

// expandTodoEmbedded rewrites the columns a map update cannot carry.
//
// Nothing to do: Todo has no embedded column. It exists so that every
// path writing through a map calls the same thing, and adding a money field
// later is a change here rather than at each of them.
func expandTodoEmbedded(updates map[string]interface{}) {}

// writableTodo is every column Patch and Bulk may write. id, the
// timestamps and the version are the framework's, and are dropped.
var writableTodo = map[string]bool{
	"title":     true,
	"completed": true,
}

// db binds the database to ctx, so whatever a middleware put there reaches
// GORM's callbacks: the multitenant plugin scopes by it.
func (s *TodoService) db(ctx context.Context) *gorm.DB {
	return s.DB.WithContext(ctx)
}

// write is a session for a single-statement write: no wrapping transaction,
// and RETURNING where the dialect has it. Safe only because every write it is
// used for is exactly one statement, which the generator knew.
func (s *TodoService) write(db *gorm.DB) *gorm.DB {
	tx := db.Session(&gorm.Session{SkipDefaultTransaction: true})
	if s.returning(db) {
		tx = tx.Clauses(clause.Returning{})
	}
	return tx
}

// returning reports whether the dialect hands back the written row. MySQL
// does not, and does not say so: the clause is dropped and the defaults come
// back empty, so there the row is read again.
func (s *TodoService) returning(db *gorm.DB) bool {
	switch db.Dialector.Name() {
	case "postgres", "sqlite":
		return true
	}
	return false
}

// List returns one page of todos.
//
//	archived "true" or "1"   only archived rows
//	archived "all"           both
//	anything else            only live rows
func (s *TodoService) List(ctx context.Context, p paginate.Params, archived string) (paginate.Result[models.Todo], error) {
	query := s.db(ctx).Model(&models.Todo{})

	// Archived rows are excluded by default. Anything else means an operator
	// archives twelve rows, sees the count go down, and finds them again the
	// next time somebody sorts by a different column.
	switch archived {
	case "true", "1":
		query = query.Where("archived_at IS NOT NULL")
	case "all":
		// no filter
	default:
		query = query.Where("archived_at IS NULL")
	}

	return paginate.List[models.Todo](query, p, todoListConfig)
}

// Export hands every matching todo to each, a batch at a time, so a large
// table is never in memory at once. search matches the columns List searches.
//
// No ORDER BY of its own: FindInBatches pages by primary key, which is
// creation order for the time-ordered ids Grit issues, and a sort in front of
// that key repeated rows from the second batch on.
func (s *TodoService) Export(ctx context.Context, search string, each func(rows []models.Todo) error) error {
	query := s.db(ctx).Model(&models.Todo{})
	if search != "" {
		clause := ""
		args := []any{}
		wild := "%" + search + "%"
		for i, col := range todoListConfig.Searchable {
			if i > 0 {
				clause += " OR "
			}
			clause += "LOWER(" + col + ") LIKE LOWER(?)"
			args = append(args, wild)
		}
		if clause != "" {
			query = query.Where(clause, args...)
		}
	}

	// FindInBatches fills rows and pages by primary key. The tx it hands the
	// callback is a fresh session with no query on it, so each batch is read
	// from rows: re-reading it through tx.Scan found nothing, and every export
	// was an empty file with a 200.
	var rows []models.Todo
	return query.FindInBatches(&rows, 1000, func(tx *gorm.DB, batch int) error {
		return each(rows)
	}).Error
}

// GetByID returns one todo with the relations shown beside it.
func (s *TodoService) GetByID(ctx context.Context, id string) (*models.Todo, error) {
	var item models.Todo
	if err := s.db(ctx).First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	if d := authz.Inspect(ctx, "todos.read", &item); !d.Allowed() {
		return nil, authz.Denied("todos.read", d)
	}
	return &item, nil
}

// load reads the row a write is about to change, without its relations.
//
// ability is what the caller is about to do, "update" or "delete", so a
// policy can refuse one without refusing the other.
func (s *TodoService) load(ctx context.Context, id, ability string) (*models.Todo, error) {
	var item models.Todo
	if err := s.db(ctx).First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	// A policy rule narrows this further than the route's permission did.
	// None defined means no narrowing, which is how the project behaved
	// before it had policies. See internal/policies.
	if d := authz.Inspect(ctx, "todos."+ability, &item); !d.Allowed() {
		return nil, authz.Denied("todos."+ability, d)
	}
	return &item, nil
}

// conflict is the answer to a write whose precondition failed: the version
// the row is at now.
func (s *TodoService) conflict(ctx context.Context, id string) error {
	var current models.Todo
	if err := s.db(ctx).Select("version").First(&current, "id = ?", id).Error; err != nil {
		return err
	}
	return &concurrency.ErrConflict{Current: current.Version}
}

// Create saves a new todo and fills item in as it was stored.
func (s *TodoService) Create(ctx context.Context, item *models.Todo) error {
	db := s.db(ctx)
	if err := s.write(db).Create(item).Error; err != nil {
		return err
	}
	if !s.returning(db) {
		if err := db.First(item, "id = ?", item.ID).Error; err != nil {
			return err
		}
	}
	return nil
}

// Update writes updates to one todo. With a precondition it lands only
// if the row is still at that version, and otherwise returns an
// *concurrency.ErrConflict naming the version it is at.
func (s *TodoService) Update(ctx context.Context, id string, updates map[string]interface{}, pre *concurrency.Precondition) (*models.Todo, error) {
	item, err := s.load(ctx, id, "update")
	if err != nil {
		return nil, err
	}
	db := s.db(ctx)
	expandTodoEmbedded(updates)
	written := s.write(db).Model(item).Scopes(pre.Scope).Updates(updates)
	if err := written.Error; err != nil {
		return nil, err
	}
	// pre named a version this record has moved past: someone else saved
	// first. A conflict rather than overwriting their change.
	if pre.Missed(written) {
		return nil, s.conflict(ctx, item.ID)
	}
	if !s.returning(db) {
		if err := db.First(item, "id = ?", item.ID).Error; err != nil {
			return nil, err
		}
	}
	return item, nil
}

// Patch writes only the columns body names, leaving every other one as it
// is. Keys that are not writable columns are dropped. It returns the row and
// the columns it wrote.
func (s *TodoService) Patch(ctx context.Context, id string, body map[string]interface{}, pre *concurrency.Precondition) (*models.Todo, map[string]interface{}, error) {
	item, err := s.load(ctx, id, "update")
	if err != nil {
		return nil, nil, err
	}
	db := s.db(ctx)

	updates := map[string]interface{}{}
	for k, v := range body {
		if writableTodo[k] {
			updates[k] = v
		}
	}
	touchedRelations := false
	if len(updates) == 0 && !touchedRelations {
		return nil, nil, respond.Rule("No writable fields in request body")
	}

	expandTodoEmbedded(updates)
	if len(updates) > 0 {
		written := s.write(db).Model(item).Scopes(pre.Scope).Updates(updates)
		if err := written.Error; err != nil {
			return nil, nil, err
		}
		if pre.Missed(written) {
			return nil, nil, s.conflict(ctx, item.ID)
		}
	}
	if !s.returning(db) {
		if err := db.First(item, "id = ?", item.ID).Error; err != nil {
			return nil, nil, err
		}
	}
	return item, updates, nil
}

// Delete soft-deletes one todo and returns it as it was.
func (s *TodoService) Delete(ctx context.Context, id string) (*models.Todo, error) {
	item, err := s.load(ctx, id, "delete")
	if err != nil {
		return nil, err
	}
	if err := s.db(ctx).Delete(item).Error; err != nil {
		return nil, err
	}
	return item, nil
}

// TodoBulkResult is what a bulk action did.
type TodoBulkResult struct {
	// IDs are the rows acted on: those requested that exist, that the caller
	// may touch, and that the action applies to.
	IDs []string
	// Updates are the columns a patch wrote, after the whitelist.
	Updates map[string]interface{}
}

// Bulk applies one action to many todos in a single transaction: all of
// it lands or none of it does. action is delete, archive, restore or patch.
func (s *TodoService) Bulk(ctx context.Context, action string, ids []string, patch map[string]interface{}) (TodoBulkResult, error) {
	db := s.db(ctx)
	var result TodoBulkResult

	// Unarchived rows for archive, archived for restore: without it a mixed
	// selection reports "12 archived" having changed three.
	scope := db.Model(&models.Todo{}).Where("id IN ?", ids)
	if action == "restore" {
		scope = scope.Where("archived_at IS NOT NULL")
	} else if action == "archive" {
		scope = scope.Where("archived_at IS NULL")
	}
	var items []models.Todo
	if err := scope.Find(&items).Error; err != nil {
		return result, fmt.Errorf("loading todos: %w", err)
	}
	for _, item := range items {
		result.IDs = append(result.IDs, item.ID)
	}
	if len(result.IDs) == 0 {
		return result, nil
	}

	if action == "patch" {
		// The same whitelist as Patch. Framework-owned columns are dropped
		// rather than refused, so a client sending the whole row is not wrong.
		result.Updates = map[string]interface{}{}
		for k, v := range patch {
			if writableTodo[k] {
				result.Updates[k] = v
			}
		}
		if len(result.Updates) == 0 {
			return TodoBulkResult{}, respond.Rule("No writable fields in patch")
		}
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		switch action {
		case "delete":
			return tx.Where("id IN ?", result.IDs).Delete(&models.Todo{}).Error
		case "archive":
			return tx.Model(&models.Todo{}).Where("id IN ?", result.IDs).
				Update("archived_at", time.Now()).Error
		case "restore":
			return tx.Model(&models.Todo{}).Where("id IN ?", result.IDs).
				Update("archived_at", nil).Error
		case "patch":
			expandTodoEmbedded(result.Updates)
			return tx.Model(&models.Todo{}).Where("id IN ?", result.IDs).
				Updates(result.Updates).Error
		}
		return respond.Rule("unknown bulk action %q", action)
	})
	if err != nil {
		return TodoBulkResult{}, err
	}
	return result, nil
}

// TodoRowError is one row of a grid that could not be saved, and why.
//
// The index is the row's position in the request, not its id: a create has no
// id yet, and the grid needs to put the message back on the line the operator
// is looking at.
type TodoRowError struct {
	Index   int    `json:"index"`
	Message string `json:"message"`
}

// TodoGridEdit is one row's changes: the id, and only the columns that
// changed. Sending the whole row would make every save a write to every column,
// which loses a concurrent edit to a column this operator never touched.
type TodoGridEdit struct {
	ID    string                 `json:"id"`
	Patch map[string]interface{} `json:"patch"`
}

// BulkEdit writes a different patch to each row, in one transaction.
//
// Bulk(action: "patch") writes ONE set of values to every selected row, which
// is the right shape for "set the status of these forty" and the wrong one for
// a spreadsheet, where the point is that each row differs. Hence two methods
// rather than one with a mode.
//
// All of it lands or none of it does. A grid where rows 1 to 9 saved and row 10
// did not is one the operator has to reconcile by hand against a list of
// indexes, and they will not.
func (s *TodoService) BulkEdit(ctx context.Context, edits []TodoGridEdit) ([]string, []TodoRowError, error) {
	var rowErrors []TodoRowError
	type write struct {
		id      string
		updates map[string]interface{}
	}
	writes := make([]write, 0, len(edits))

	for i, edit := range edits {
		if edit.ID == "" {
			rowErrors = append(rowErrors, TodoRowError{Index: i, Message: "no id"})
			continue
		}
		// The same whitelist Patch uses. Framework-owned columns are dropped
		// rather than refused, so a grid sending a whole row is not wrong.
		updates := map[string]interface{}{}
		for k, v := range edit.Patch {
			if writableTodo[k] {
				updates[k] = v
			}
		}
		if len(updates) == 0 {
			// Nothing writable changed. Not an error: a grid sends every row
			// the operator touched, and touching a cell and putting it back is
			// a thing people do.
			continue
		}
		expandTodoEmbedded(updates)
		writes = append(writes, write{id: edit.ID, updates: updates})
	}
	if len(rowErrors) > 0 {
		return nil, rowErrors, nil
	}
	if len(writes) == 0 {
		return nil, nil, nil
	}

	// Only rows this caller may touch. An owned resource scopes to the caller,
	// so a guessed id in the grid changes nothing rather than somebody else's
	// row.
	ids := make([]string, 0, len(writes))
	for _, w := range writes {
		ids = append(ids, w.id)
	}
	var allowed []models.Todo
	if err := s.db(ctx).Model(&models.Todo{}).Where("id IN ?", ids).Find(&allowed).Error; err != nil {
		return nil, nil, fmt.Errorf("loading todos to edit: %w", err)
	}
	exists := make(map[string]bool, len(allowed))
	for _, row := range allowed {
		exists[row.ID] = true
	}
	for i, w := range writes {
		if !exists[w.id] {
			rowErrors = append(rowErrors, TodoRowError{Index: i, Message: "no such todo"})
		}
	}
	if len(rowErrors) > 0 {
		return nil, rowErrors, nil
	}

	saved := make([]string, 0, len(writes))
	err := s.db(ctx).Transaction(func(tx *gorm.DB) error {
		for _, w := range writes {
			// Row by row, because each has its own values. One statement per
			// row inside one transaction: the round trips are the cost of the
			// feature, and the atomicity is the point of it.
			if err := tx.Model(&models.Todo{}).Where("id = ?", w.id).Updates(w.updates).Error; err != nil {
				return err
			}
			saved = append(saved, w.id)
		}
		return nil
	})
	if err != nil {
		return nil, nil, err
	}
	return saved, nil, nil
}

// BulkCreate inserts many todos in one transaction.
//
// Every row is decoded before anything is written, so a spreadsheet with a
// mistake on row 7 is refused whole and reported against row 7, rather than
// creating six rows and stopping.
func (s *TodoService) BulkCreate(ctx context.Context, rows []map[string]interface{}) ([]models.Todo, []TodoRowError, error) {
	var rowErrors []TodoRowError
	items := make([]models.Todo, 0, len(rows))

	for i, row := range rows {
		// Through the same JSON path a single create takes, so the model's own
		// tags and hooks apply identically. A second way into the table is a
		// second set of rules to keep in step.
		encoded, err := json.Marshal(row)
		if err != nil {
			rowErrors = append(rowErrors, TodoRowError{Index: i, Message: "could not be read"})
			continue
		}
		var item models.Todo
		if err := json.Unmarshal(encoded, &item); err != nil {
			rowErrors = append(rowErrors, TodoRowError{Index: i, Message: err.Error()})
			continue
		}
		// Never from the request: these are the database's to set.
		item.ID = ""
		item.CreatedAt = time.Time{}
		item.UpdatedAt = time.Time{}
		// The binding: tags, which encoding/json does not know about.
		//
		// A single create is bound by gin, so required and min are enforced
		// before the handler runs. This path decodes the row itself, and
		// without this line the grid could insert a row the form would then
		// refuse to save: a todo with no category went in, and editing it
		// answered "Category is required" with no way to get at the row.
		if err := respond.ValidateStruct(&item); err != nil {
			rowErrors = append(rowErrors, TodoRowError{Index: i, Message: err.Error()})
			continue
		}
		items = append(items, item)
	}
	if len(rowErrors) > 0 {
		return nil, rowErrors, nil
	}
	if len(items) == 0 {
		return nil, nil, nil
	}

	err := s.db(ctx).Transaction(func(tx *gorm.DB) error {
		// One at a time rather than CreateInBatches, because the model's
		// BeforeCreate hooks (the uuid, the slug, a sequence number) have to
		// run per row, and a batch insert of rows whose slugs collide is a
		// constraint violation with no row number in it.
		for i := range items {
			if err := tx.Create(&items[i]).Error; err != nil {
				return fmt.Errorf("row %d: %w", i+1, err)
			}
		}
		return nil
	})
	if err != nil {
		return nil, nil, err
	}
	return items, nil, nil
}

// publicScope narrows a query to what an anonymous caller may see.
//
// Every public read below goes through it. Add a condition here and it applies
// to the list, the detail page and everything derived from them at once.
func (s *TodoService) publicScope(q *gorm.DB) *gorm.DB {
	q = q.Where("archived_at IS NULL")
	return q
}

// ListPublic returns one page of what the public surface may list: rows that are
// not archived. cfg is the allowlist the public handler keeps.
func (s *TodoService) ListPublic(ctx context.Context, params paginate.Params, cfg paginate.Config) (paginate.Result[models.Todo], error) {
	query := s.publicScope(s.db(ctx).Model(&models.Todo{}))
	return paginate.List[models.Todo](query, params, cfg)
}

// GetPublic returns the todo whose id is key, if it is
// not archived.
//
// A row outside that is a 404 rather than a 403: whether it exists is itself
// not public.
func (s *TodoService) GetPublic(ctx context.Context, key string) (*models.Todo, error) {
	var item models.Todo
	if err := s.publicScope(s.db(ctx).Model(&models.Todo{})).
		Where("id = ?", key).First(&item).Error; err != nil {
		return nil, err
	}
	return &item, nil
}
