# Your learning route
You already know JavaScript and React. This book adds the Go and Next.js ideas needed to understand the contact application in this workspace. Read one lesson, run its experiment in a disposable practice project, and explain the result before moving on. Book 2 teaches Grit’s workflow; Book 3 assembles the real application.

The application has three processes: a Go API, a Next.js admin panel and a Next.js public website. Shared TypeScript schemas connect the frontends, but Go independently validates HTTP requests. Public visitors can create, read, edit and delete contacts. Administrators also have a protected management surface. This is an intentional access model, not a missing login screen.

## Establish the version boundary
The inspected project records Grit 3.397.0. The documentation snapshot retrieved on 13 October 2026 identifies 3.398.0. The project declares Go 1.26.9, Next.js 16.3.8 and pnpm 10.33.4. Use the checked-in manifests and lockfile when reproducing it. A documentation minimum is not a promise that this particular project builds with that minimum.

Code labelled as a small example teaches a concept; the complete contact implementation is in the companion to Book 3. Do not paste isolated snippets over an entire generated file.

## Practice rhythm
1. Predict the request, response or rendered state.
2. Run the smallest experiment that proves it.
3. Inspect the Network panel and API logs together.
4. Record what would change if validation, storage or the network failed.

> Completion means you can trace a contact from an input box to a database row and back, including the unhappy paths.

:::refs https://go.dev/tour/welcome/1, https://nextjs.org/docs/app/getting-started

# One request through the whole system
When a visitor submits “Amina Example”, React holds the draft, a schema checks it, fetch serializes it to JSON, and Gin binds that JSON into a Go request struct. The handler calls a service. GORM translates the service’s write into SQL. The API replies with a status and JSON; the frontend refreshes the relevant query.

:::diagram Form state and schema | JSON over HTTP | Gin handler and service | GORM and the database | Response and query invalidation

These are separate boundaries. A valid form does not prove the server accepted the request. A 201 response does not prove an old list cache has refreshed. A source-code edit does not prove the running executable contains that edit.

## Trace it yourself
Open the browser’s Network panel, submit one fictional contact and inspect the request body. Confirm the property is `name`, not `Name` or a nested `contact.name`. Inspect the status, response body and subsequent list request. Compare the returned ID with the row you view in the admin panel.

## Exercise and answer
The form shows the new name, but no request appears. Which layer do you inspect first? Start with submit wiring and browser validation. If a request appears with correct JSON but the database stores empty fields, inspect server binding, service assignments, running process and database connection. Changing CSS cannot fix that boundary.

:::refs docs/backend/handlers, docs/backend/services

# Toolchains, modules and running processes
JavaScript source is commonly interpreted or transformed during development. Go compiles source into an executable. Editing a Go file changes the next build; an already running binary keeps its old behavior until restarted or replaced by a working development watcher.

```powershell
go version
node --version
pnpm --version
grit version
Set-Location apps/api
go env GOMOD
go test ./internal/services
```

Run commands from the directory they expect. The API’s relative storage directory is resolved from its working directory. Starting the same executable from the repository root can make it look in a different `storage/app` directory. This explained the image failure in this contact project.

## Understand the files
`go.mod` declares the module path, Go requirements and dependencies. `go.sum` records module checksums. `package.json` and `pnpm-lock.yaml` serve related roles on the frontend, but their formats and resolution rules differ. A workspace contains multiple packages; installing one dependency does not necessarily add it to every package.

## Exercise and answer
An invalid request still returns the old error after you edit the handler. Confirm the port’s owning process, rebuild output and restart location. Then repeat the exact same request. A changed response after restart is evidence of source/runtime mismatch; it is not evidence that the browser changed its payload.

:::refs https://go.dev/doc/modules/managing-dependencies, docs/prerequisites/golang

# Packages, imports and visibility
Every Go source file belongs to a package. Files in the same directory normally share that package. Exported identifiers begin with an uppercase letter; lowercase names are package-private. This replaces JavaScript’s per-declaration `export` syntax.

```go
package contacts

import "strings"

func NormalizeName(value string) string {
    return strings.TrimSpace(value)
}

func isBlank(value string) bool {
    return NormalizeName(value) == ""
}
```

`NormalizeName` can be called by another package; `isBlank` cannot. Imports must be used. Go rejects unused imports so refactoring often includes removing them. `gofmt` handles standard layout; it is normal to let tools format your code rather than debate indentation.

The module path in this project is part of imports such as `todo-app/apps/api/internal/models`. The `internal` directory has an enforced import boundary: unrelated external code cannot import those packages. It is not merely a naming convention.

## Exercise
Create a tiny separate module, put the example in a `contacts` package and call the exported function from `main`. Try calling `isBlank` from `main` and read the compiler error. Explain why changing its first letter changes access but does not change the algorithm.

## Answer
Go uses capitalization as part of its visibility rules. Keep helper functions private unless another package needs them. A narrow public API makes later refactoring easier because fewer callers depend on implementation details.

:::refs https://go.dev/tour/basics/1, https://go.dev/doc/modules/layout

# Variables and zero values
Go variables have a fixed type and a zero value. A string starts as `""`, a number as 0, a boolean as false, and pointers, maps and slices as nil. There is no universal JavaScript-like `undefined` value for every type.

```go
var email string          // ""
var count int             // 0
var verified bool         // false
name := "Amina Example"   // inferred string, inside a function
```

This matters for JSON binding. If a request omits an ordinary string field, the bound string remains empty. It also matters for persistence: an empty Go string can become an empty SQL string. Merely avoiding an assignment does not automatically produce SQL NULL.

Use `:=` for concise local declarations when the value makes the type clear. Use `var` for a deliberate zero value or when the type itself is important. A short declaration must introduce at least one new variable in its scope. Do not confuse a new inner variable with an assignment to an outer one.

## Exercise and answer
Predict the email after `var req struct { Email string }` receives `{}`. It is `""`. Two inserts of that value into a unique email column can conflict. Optional email therefore requires an intentional representation and insert policy, not only an optional frontend input.

:::refs https://go.dev/tour/basics/11, docs/concepts/field-types

# Functions and explicit errors
Go functions can return multiple values. The common `(value, error)` pattern makes failure part of a function’s interface. Check the error before using a result that may be invalid.

```go
func RequireName(raw string) (string, error) {
    name := strings.TrimSpace(raw)
    if name == "" {
        return "", errors.New("name is required")
    }
    return name, nil
}

name, err := RequireName(req.Name)
if err != nil {
    // Translate the validation error into an HTTP response.
    return
}
_ = name // only to keep this isolated example compilable
```

The complete snippet also needs imports for `strings` and `errors`. In real handler code, replace the comment with the project’s response helper and use `name` in the model. Avoid swallowing errors with `_`; that is shown only for the isolated teaching fragment.

Wrap an error with context using `fmt.Errorf("create contact: %w", err)` when a higher layer benefits from it. Use `errors.Is` for a known sentinel error and `errors.As` for a typed error. Do not match arbitrary database error strings in every handler if the service already normalizes them.

## Exercise and answer
Why return immediately after writing a validation response? Otherwise execution can continue into the database write or attempt a second response. An early return makes the successful path easy to follow.

:::refs https://go.dev/blog/error-handling-and-go, docs/backend/error-handling

# Structs and tags define boundaries
A struct groups typed fields. Tags are metadata read by libraries through reflection. A JSON tag controls the wire name; a GORM tag controls persistence; a binding tag controls request validation. These mechanisms do not replace one another.

```go
type CreateContactRequest struct {
    Name  string `json:"name" binding:"required"`
    Email string `json:"email" binding:"omitempty,email"`
}

type PublicContact struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}
```

The request DTO describes accepted input. The database model includes persistence fields. The response DTO describes disclosed output. Keeping them separate prevents a future model column from accidentally becoming writable or public.

Go does not execute the shared Zod schema. TypeScript’s static types also disappear at runtime. The browser’s validation improves feedback, the Go binding layer checks incoming requests, and database constraints protect stored invariants. These layers should agree but require separate verification.

## Exercise and answer
Add an imaginary `InternalNote` column to a model. Should it appear in the public response? Only after you intentionally add it to the public allowlist and mapper. Returning the whole model bypasses that decision. In the companion snapshot, public create still returns the model; Book 3 identifies that asymmetry explicitly.

:::refs docs/backend/models, docs/backend/public-api

# Pointers, nil and partial updates
A pointer stores an address. `*T` means pointer to T; `&value` obtains an address; `*pointer` reads the value it points to. A nil pointer points to nothing and must not be dereferenced.

```go
type PatchContact struct {
    Name *string `json:"name"`
}

if req.Name != nil {
    updates["name"] = strings.TrimSpace(*req.Name)
}
```

This distinguishes an omitted name from a provided empty name in many update designs. However, a plain pointer decoded with standard JSON cannot distinguish an omitted property from an explicit JSON null: both can yield nil. A true three-state PATCH needs a presence-aware wrapper or raw field tracking.

The contact app’s public edit uses PUT with the full editable record. That keeps its semantics simpler: absent optional fields can be cleared, so the client must send or preserve fields it wants to keep. Do not reuse PUT blindly for a one-field toggle.

## Exercise and answer
The user changes the phone while a form drops the existing profile reference. What could happen? A replacement update may clear the photo. Preserve `profile` in edit defaults and submitted values until the UI deliberately offers photo removal.

> “Optional in a type” is not a complete update policy. Define what omission, null and empty string mean for each endpoint.

:::refs https://go.dev/tour/moretypes/1, docs/backend/handlers

# Methods, receivers and dependencies
A method is a function attached to a receiver type. A pointer receiver can mutate the receiver and avoids copying it. A value receiver receives a copy. Choose based on semantics and consistency, not by assuming every struct must use pointers.

```go
type ContactService struct {
    DB *gorm.DB
}

func (s *ContactService) Find(ctx context.Context, id string) error {
    var item Contact
    return s.DB.WithContext(ctx).First(&item, "id = ?", id).Error
}
```

This abbreviated example omits imports and a returned model so that the receiver and database dependency stand out. The actual service in the companion has a richer interface and error mapping.

Grit constructs handlers with database and storage dependencies. That is dependency injection: the handler receives what it needs instead of secretly constructing everything inside each request. It makes configuration visible and testing easier.

## Exercise and answer
Why should every request not open a new independent database pool? A pool is designed to be reused; recreating it wastes connections and complicates cleanup. Pass the application’s configured database handle through the existing construction path. Use a transaction handle only for operations belonging to that transaction.

:::refs https://go.dev/tour/methods/1, docs/backend/services

# Slices, maps and safe query input
A slice is a view over an array with a length and capacity. A map associates keys with values. Both are reference-like structures, but a nil map cannot accept writes until initialized.

```go
out := make([]PublicContact, 0, len(rows))
for _, row := range rows {
    out = append(out, PublicContact{ID: row.ID, Name: row.Name})
}

updates := map[string]interface{}{
    "phone": "",
    "email": nil,
}
```

Initializing the response slice means an empty result encodes as `[]`, a useful list contract. The update map deliberately includes an empty phone and NULL email. GORM struct updates commonly skip zero values; a map can express deliberate clearing. Check the method being used rather than assuming all update APIs behave identically.

The public contact list supplies allowlists for searchable and sortable columns. Parameter placeholders protect values, but arbitrary user-controlled SQL column names need separate validation. Accept a finite sort field set such as name and creation time.

## Exercise and answer
Should `sort_by` be concatenated directly into an ORDER BY clause? No. Resolve it through an allowlist. Can a client reveal hidden records by adding a visibility filter? Only if the server wrongly makes that policy user-controlled. Keep the public scope in the service.

:::refs https://go.dev/tour/moretypes/6, docs/backend/pagination

# Interfaces make replacements possible
A Go interface describes behavior through methods. A type implements it implicitly by supplying those methods; no `implements` declaration is needed. Prefer small interfaces at the consuming boundary.

```go
type NameReader interface {
    FindName(ctx context.Context, id string) (string, error)
}

type GreetingService struct {
    Names NameReader
}
```

In production, a database-backed type can implement NameReader. In a unit test, a small fake can return a known name or error. This avoids booting an entire application to test a greeting rule. For database constraints, use an integration test because a fake cannot prove SQL behavior.

Storage adapters are a practical example: application code can ask for file operations without hard-coding every local or object-storage implementation. The chosen adapter still has real path, URL and availability requirements.

## Exercise and answer
You need to test a network failure. Should you add a global boolean to production code? Usually inject a small dependency that can fail in the test. Keep the interface close to what the consumer actually uses; a huge “all services” interface makes fakes harder to maintain.

:::refs https://go.dev/tour/methods/9, docs/backend/storage

# Context carries cancellation
`context.Context` carries deadlines, cancellation and request-scoped values through Go calls. Pass it as the first argument by convention. Do not replace a live request context with `context.Background()` just to simplify a database call.

```go
ctx, cancel := context.WithTimeout(parent, 2*time.Second)
defer cancel()

err := db.WithContext(ctx).First(&contact, "id = ?", id).Error
```

If the client disconnects or the deadline expires, compatible downstream operations can stop. Cancellation is cooperative: a loop that never checks its context will not magically stop because a context exists.

The contact handlers use the request context for reads and a project helper for writes. That helper can attach actor information used by audit or service logic. An anonymous public request should not be described as a signed-in administrator merely because it reaches the same service.

## Exercise and answer
A task must send an email after the request ends. Should it keep using the request context in a detached goroutine? No; cancellation may arrive immediately, and the process may exit. Put durable work into the configured job system with a defined retry and idempotency policy. A background context alone does not make a task durable.

:::refs https://go.dev/blog/context, docs/backend/jobs

# Defer and resource lifetime
`defer` schedules a function call to run when the surrounding function returns. It is useful for closing resources, releasing locks and cancelling derived contexts. Deferred calls execute in last-in, first-out order.

```go
file, err := os.Open("example.txt")
if err != nil {
    return err
}
defer file.Close()
```

Check creation errors before deferring cleanup. A loop that opens thousands of files and defers every close until the outer function ends may keep thousands of files open. Move the per-file work into a helper or close each resource at the right scope.

React has a related lifetime idea: an effect can return cleanup for a timer, subscription or fetch cancellation. That is not Go defer, but both force you to ask who owns a resource and when that ownership ends.

```tsx
useEffect(() => {
  const timer = setTimeout(() => setSearch(draft), 300);
  return () => clearTimeout(timer);
}, [draft]);
```

## Exercise and answer
Why clear the timer? Each change schedules another callback. Cleanup prevents outdated callbacks from applying old search text. Request cancellation and stable query keys handle the remaining network-level concerns.

:::refs https://go.dev/tour/flowcontrol/12, https://react.dev/reference/react/useEffect

# Bind, normalize, validate, persist
Treat incoming JSON as untrusted input even when your own form produced it. A user can call the endpoint directly. Bind into a request DTO, normalize where appropriate, validate the normalized meaning, and only then construct the model.

```go
var req CreateContactRequest
if err := c.ShouldBindJSON(&req); err != nil {
    respond.Fail(c, respond.CodeValidationError, err.Error())
    return
}
req.Name = strings.TrimSpace(req.Name)
if req.Name == "" {
    respond.Validation(c, "Name is required",
        map[string]string{"name": "Name is required"})
    return
}
```

The contact name’s non-empty check after trimming rejects whitespace-only submissions. Optional email needs an equally deliberate empty-value policy. Do not lowercase arbitrary free text indiscriminately; normalize only where the field’s rules support it.

## Exercise
Try `{}`, a malformed JSON body, a whitespace-only name, an invalid email and a valid name with no email. Predict each outcome before sending it to a disposable database.

## Answer
Malformed or invalid input should be rejected before persistence. A valid name with no email should succeed if the product allows it. Repeating that valid no-email request with a different name should also succeed; a second insert conflict indicates an empty-string/NULL policy problem or another constraint.

:::refs docs/backend/validation, docs/backend/handlers

# HTTP is a contract
HTTP combines a method, URL, headers, status and optional body. The public contact surface uses GET for list/detail, POST for creation, PUT for replacement of editable fields and DELETE for soft deletion.

- 200: a successful read, update or this application’s delete response.
- 201: creation succeeded.
- 401/403: a credential or permission problem; distinguish them from missing data.
- 404: the public resource is unavailable.
- 409: a conflict such as a unique constraint; read the error envelope.
- 422: the application rejected validation input.
- 5xx or network failure: the operation could not complete normally.

Do not rely only on the status label. The body can carry a useful message and field errors. A 409 does not prove that the email the user sees was the value actually inserted.

```ts
const response = await fetch(url, options);
const body = await response.json().catch(() => null);
if (!response.ok) {
  throw new Error(body?.error?.message ?? "Request failed");
}
```

Fetch rejects on network failures but normally resolves for HTTP 409 or 500. That is why checking `response.ok` is necessary. A DELETE endpoint may return only a message; do not force it through a helper that assumes every success has `data`.

## Checkpoint
Explain why an empty list, a missing contact and a failed API should render three different states. The user needs different next actions for each.

:::refs docs/backend/error-handling, https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch

# Middleware and access boundaries
Middleware runs around a handler to add shared behavior such as CORS, API-key checking, authentication, request logging or rate limiting. Route groups decide which middleware a route inherits.

In this app, public routes are outside user authentication but still require the project’s public API key. Protected admin routes require the appropriate authorization. A browser-visible key identifies a public client; it cannot serve as a secret user password because visitors can inspect it.

```go
m.Public.GET("/contacts", h.ListPublic)
m.Public.POST("/contacts", h.PublicCreate)
m.Staff.DELETE("/contacts/:id",
    middleware.RequireRole("ADMIN", "perm:contacts.delete"), h.Delete)
```

CORS is a browser response policy. It does not make an endpoint private from command-line clients. A custom `If-Match` header may cause a preflight request; the API must allow it. If a request works in PowerShell but fails in the browser, inspect OPTIONS and response headers before rewriting the service.

## Exercise and answer
Is hiding the Delete button sufficient to prevent deletion? No. The server must enforce the chosen policy. Here everyone is deliberately allowed to delete through the public surface, while staff management remains protected. A future private-contact product would need a different server policy.

:::refs docs/backend/middleware, docs/backend/public-api

# GORM and relational thinking
GORM maps Go structs to database operations. It does not remove the need to understand keys, indexes, NULL, transactions and query plans. Inspect the model and SQL semantics whenever a bug involves stored data.

```go
var contact models.Contact
err := db.WithContext(ctx).
    First(&contact, "id = ?", id).Error
```

The placeholder binds a value safely. The current contact ID is a UUID represented as a string. Some older project guidance mentions unsigned integer IDs; do not apply that to this model. A BeforeCreate hook supplies IDs, and a BeforeUpdate hook participates in version changes.

Soft deletion usually hides rows through GORM’s scope while retaining them physically. That affects uniqueness, exports, restore workflows and tests. A deleted row can still occupy a unique index unless the schema deliberately says otherwise.

## Exercise and answer
A database viewer shows a row, but the public detail endpoint returns 404. Possible explanations include soft deletion and public visibility scope. Query the same database, inspect the scope and model, and avoid disabling all scopes just to make the row appear. Public absence can be deliberate.

:::refs https://gorm.io/docs/models.html, https://gorm.io/docs/query.html

# Empty strings, NULL and uniqueness
An empty string is a real value. SQL NULL represents absence. Unique-index handling of NULL depends on the database and index definition; the SQLite setup used here allows multiple NULL emails with its ordinary unique index, while repeated empty strings conflict.

The service’s contact create path explicitly omits an absent email. This works because the inspected email column is nullable and has no default that reintroduces an empty string. A schema with NOT NULL or a default of `''` would require a different migration and policy.

```go
write := tx
if item.Email == "" {
    write = write.Omit("email")
}
if err := write.Create(item).Error; err != nil {
    return err
}
```

This is a focused extract, not the entire transaction. The update path uses a map with `email: nil` when the user clears the field. The frontend’s blank-to-undefined transform helps produce clean input but cannot alone determine how Go persists it.

## Exercise and answer
Test two contacts without emails, then two with the same non-empty email. The first pair should succeed under the chosen policy; the second pair should conflict. Also test reusing a soft-deleted email and document the actual behavior. Do not delete the original empty record merely to hide the bug.

:::refs https://gorm.io/docs/create.html, https://www.sqlite.org/lang_createtable.html

# Transactions and concurrent edits
A transaction groups database operations so they commit or roll back together. Use it when a partial result would violate a business invariant. Do not assume sending an email inside a transaction makes the email reversible.

```go
err := db.Transaction(func(tx *gorm.DB) error {
    // Perform related writes through tx, not the outer db handle.
    return tx.Create(&contact).Error
})
```

Optimistic concurrency solves a different problem: two people editing the same version. The contact response includes a version; the edit helper can send it in `If-Match`. The service’s existing concurrency mechanism checks the version. If an edit is rejected, preserve the user’s draft and offer a refresh rather than silently replacing someone else’s update.

The current version field is optional in the frontend type, so a request without it may not receive the same protection. Do not claim every write is conflict-protected. The public delete path does not send a version token in this snapshot.

## Exercise and answer
Open the same contact in two tabs. Save in tab A, then save the old version in tab B. Inspect the response produced by the project’s concurrency helper. A correct conflict flow keeps B’s draft visible and makes the need to reload understandable.

:::refs https://gorm.io/docs/transactions.html, docs/backend/concurrency

# Generics on both sides
Go generics parameterize types and functions. TypeScript generics express relationships between input and output types. Both can reduce repetition, but neither makes external JSON trustworthy by itself.

```go
func First[T any](items []T) (T, bool) {
    if len(items) == 0 {
        var zero T
        return zero, false
    }
    return items[0], true
}
```

```ts
async function readJSON<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
```

The TypeScript assertion in the second example tells the compiler what you expect; it performs no runtime check. For an untrusted or evolving external response, parse it with a runtime schema. For this app, keep the Go public DTO and frontend interface aligned and test the envelope contract.

## Exercise and answer
If the API returns `{ data: null }` where the UI expects a contact, will a generic prevent a crash? No. The generic only changes compile-time assumptions. Explicit missing/error handling or schema parsing must deal with the actual value.

## Reading the generated code
When you see a type argument in a paginated response or JSON collection, identify which part changes with T and which logic is shared. This is more useful than memorizing the syntax in isolation.

:::refs https://go.dev/doc/tutorial/generics, https://www.typescriptlang.org/docs/handbook/2/generics.html

# Goroutines, channels and durable jobs
A goroutine runs concurrently with other goroutines. Channels coordinate communication. Neither guarantees that a task survives a process restart. Use the configured queue for durable application work that needs retries and operational visibility.

```go
select {
case result := <-results:
    _ = result
case <-ctx.Done():
    return ctx.Err()
}
```

This teaching fragment waits for a result or cancellation. The producer still needs a lifetime policy so it cannot block forever after the consumer leaves. Shared maps also need synchronization if multiple goroutines read and write them.

The contact CRUD request is short database work; there is no reason to start a goroutine merely to make it look advanced. Photo processing, large exports and bulk notifications may justify background work, with bounded concurrency and retry-safe handlers.

## Exercise and answer
A job sends a message, then crashes before acknowledging completion. It may run again. Make the operation idempotent with a durable identifier or delivery record, and understand the provider’s duplicate-handling options. “Run once” is a business requirement that must be designed, not assumed from a queue library.

:::refs https://go.dev/tour/concurrency/1, docs/backend/jobs

# Reflection, hooks and registration
Reflection lets a library inspect types and tags at runtime. Gin’s binder and GORM use that capability so your structs can describe validation and persistence. You rarely need to write reflection to use the generated app effectively, but you must understand that tags are executable configuration.

GORM hooks run around model operations. A hook can create a UUID or update a version. That means a write has behavior beyond the single line you see in a handler. Inspect hooks before duplicating that logic manually.

The current project uses per-resource route registration. An `init` function registers a callback, and the application later mounts the collected routes with configured dependencies. This is why a route may not appear as a literal line in one giant central routes file.

```go
func init() {
    RegisterRoutes(func(m *Mount) {
        // Construct the resource handler and mount its routes here.
    })
}
```

## Exercise and answer
You added a model field but the public response did not change. Is reflection broken? Probably not. The public response is an explicit allowlist, and the frontend may have its own interface. Trace every boundary instead of assuming one tag updates the whole system.

:::refs docs/backend/models, docs/backend/routes

# Testing Go behavior
Use a unit test for a pure normalization rule and an integration test for routing, binding or a database constraint. Table-driven tests make several cases readable without copying entire test functions.

```go
func TestRequireName(t *testing.T) {
    cases := []struct {
        input string
        wantError bool
    }{{"Amina", false}, {"  ", true}, {"", true}}
    for _, tc := range cases {
        t.Run(tc.input, func(t *testing.T) {
            _, err := RequireName(tc.input)
            if (err != nil) != tc.wantError {
                t.Fatalf("error = %v", err)
            }
        })
    }
}
```

The snippet belongs beside the earlier helper and needs `import "testing"`. HTTP tests can use `httptest` to create a request and recorder. Use an isolated database or testkit fixture; tests should not create and remove real user records.

```powershell
Set-Location apps/api
go test -tags integration ./internal/handlers -run TestContact -count=1
```

## Checkpoint
Test empty payload rejection, valid no-email creation, duplicate non-empty email, public read scope and edit/delete behavior. A test that only repeats the implementation’s assignment does not prove the real request-to-database boundary works.

:::refs https://go.dev/doc/tutorial/add-a-test, docs/testing

# Next.js routes and layouts
The App Router maps directories to routes. A `page.tsx` supplies a page; a `layout.tsx` wraps a segment; `[id]` is dynamic; a parenthesized route group organizes files without adding a URL segment.

```text
app/
  (marketing)/
    contacts/
      page.tsx
      [id]/
        page.tsx
```

The URLs are `/contacts` and `/contacts/<id>`, not `/marketing/contacts`. In current Next.js, server-page params are asynchronous. Await them in a Server Component before passing the string ID to a client component.

```tsx
export default async function Page({ params }: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContactDetail id={id} />;
}
```

Add the import matching your component’s actual export. The route wrapper can remain small: it owns routing, while the detail component owns interactive data states.

## Exercise and answer
Where should a shared marketing navigation bar live? In the existing marketing layout when it applies to all those pages. Do not duplicate it inside every contact component. A provider required by client hooks must also wrap the component that calls those hooks.

:::refs https://nextjs.org/docs/app/getting-started/layouts-and-pages

# Server and Client Components
App Router components are server components by default. Add `"use client"` at a client boundary when you need state, effects, event handlers or browser APIs. Imported components beneath that boundary participate in the client graph.

```tsx
"use client";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

The example needs a React `useState` import. Server components can fetch data and pass serializable props to client components. Do not pass a database connection or arbitrary function through that boundary. A server action is a separate mechanism with explicit conventions, not a reason to expose server modules to the browser.

The contact directory is interactive and uses TanStack Query, so a client component is appropriate. The surrounding route and layout can still be server components. A server-rendered initial list is an optional alternative; it requires a deliberate hydration and cache strategy.

## Exercise and answer
Can a client component safely import a module holding a secret API credential? No. Keep server-only code outside the client dependency graph. `NEXT_PUBLIC_*` values are intentionally exposed to the browser and are not secrets.

:::refs https://nextjs.org/docs/app/getting-started/server-and-client-components

# TypeScript types and runtime schemas
A TypeScript interface describes expected values during development. Zod parses and transforms actual values at runtime. React Hook Form holds draft inputs, which can differ from the parsed output type when transforms are involved.

```ts
const OptionalEmail = z.string()
  .transform(value => value === "" ? undefined : value)
  .pipe(z.string().email().optional());

type Draft = z.input<typeof CreateContactSchema>;
type Parsed = z.output<typeof CreateContactSchema>;
```

An empty text input naturally produces a string. The schema can turn that into absence before submission. The server still sees ordinary JSON and independently enforces its rules. `JSON.stringify` omits undefined object properties; it does not omit a property containing null or an empty string.

## Exercise and answer
Compare `JSON.stringify({email: undefined})`, `{email: null}` and `{email: ""}`. The first becomes `{}`, while the others retain their property. Explain how all three eventually map to the API request type. If you need distinct semantics, the Go DTO must preserve those distinctions.

## Practical rule
Use shared schemas for consistent browser forms, but test the API directly as well. Generated synchronization reduces duplication; it cannot guarantee that hand-edited Go and TypeScript validation remain equivalent forever.

:::refs https://zod.dev/basics, docs/frontend/forms

# Fetch helpers with honest outcomes
A good API helper distinguishes a successful result from an unavailable resource and a failed request. Returning an empty array whenever fetch fails makes an outage look like a database with no records.

```ts
async function getContact(id: string) {
  const response = await fetch(
    `${API_URL}/api/v1/public/contacts/${encodeURIComponent(id)}`,
    { headers: { "X-API-Key": API_KEY }, cache: "no-store" }
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to load contact");
  const body = await response.json();
  return body.data as PublicContact;
}
```

This focused example assumes the constants and interface are defined. It is not a complete runtime validator. Encode dynamic path segments and use URLSearchParams for query strings. Avoid manually concatenating unescaped user search text.

The actual helper returns null only for 404 and throws for other failures. Mutation helpers return structured status/body/message results; the form must check them before claiming success.

## Exercise and answer
The network cable is disconnected. Should the form show “email already exists”? No. Preserve the draft and display a reachability message. A duplicate-email message requires evidence from a conflict response, not a generic catch block.

:::refs https://developer.mozilla.org/en-US/docs/Web/API/Response/ok

# TanStack Query owns server state
Server state is remote, shared and potentially stale. TanStack Query tracks loading, errors, cached data and refetching for a query key. Local state is better for a modal’s open state or an unsaved search input.

```tsx
const contacts = useQuery({
  queryKey: ["public-contacts", search, sort, page],
  queryFn: () => getPublicContacts({
    search, sort_by: sort, page, page_size: 12,
  }),
});
```

Every input that changes the response belongs in the key. If search is omitted from the key, different searches can accidentally share cached results. The app must have a QueryClientProvider above this component. Reuse the generated provider rather than creating a new QueryClient on every render.

Mutation success should invalidate the relevant list and detail keys. Invalidating only one exact page may leave another cached search stale. Use a consistent prefix and check the project’s actual keys before copying examples.

## Exercise and answer
Why not put fetched contacts into `useState` again? Duplicating server state creates two sources of truth that must be synchronized. Derive rendering from the query result, and keep only independent UI state locally.

:::refs https://tanstack.com/query/latest/docs/framework/react/guides/query-keys

# Render every data state
A directory is more than a successful `.map()`. It must represent first loading, failure, empty database, empty search, successful data and background refresh. A detail page adds the missing-record state.

```tsx
if (query.isPending) return <ContactSkeletons />;
if (query.isError) return <RetryPanel onRetry={() => query.refetch()} />;
if (!query.data.data.length) return <EmptyContacts search={search} />;
return <ContactGrid contacts={query.data.data} />;
```

This simplified ordering is for initial states. When usable data exists during a background refresh, keep it visible and show a subtle refresh indicator if needed. Replacing the whole list with skeletons on every refetch makes editing feel unstable.

Use stable database IDs as React keys. A list index is fragile when sorting, adding or deleting records. Make error copy actionable: retry a load, clear a search or create the first contact.

## Exercise and answer
The API is down and the screen says “Create your first contact.” What is wrong? Failure has been collapsed into emptiness. The message incorrectly describes the database and invites a mutation that is likely to fail as well.

:::refs https://tanstack.com/query/latest/docs/framework/react/guides/queries

# Skeletons, Suspense and loading.tsx
A skeleton reserves the approximate shape of content while its data loads. It should match the real card dimensions and avoid excessive motion. Mark decorative placeholders as hidden from assistive technology and provide a concise loading status.

```tsx
function ContactSkeletons() {
  return <section aria-busy="true" aria-label="Loading contacts">
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} aria-hidden="true" className="h-44 rounded-xl bg-slate-100" />
    ))}
  </section>;
}
```

`loading.tsx` participates in route-level Suspense for server rendering/navigation. It does not automatically cover a client query started after hydration. The current contact directory needs a query-pending skeleton inside the client component.

A Suspense boundary reveals a fallback while compatible work suspends. An ordinary effect-based fetch does not become Suspense-aware because you wrap JSX in a boundary. Use the chosen data library’s documented pattern.

## Exercise and answer
Throttle the network, load the directory and then change a search. Decide which transition should show a full skeleton and which can preserve previous content. Check that the layout does not jump when real avatars and names arrive.

:::refs https://nextjs.org/docs/app/api-reference/file-conventions/loading

# Create mutations without losing drafts
A submit handler should validate, set pending state, call the API, handle the result and close only after success. Disabling repeated submission prevents accidental duplicate requests, but the server still needs its own constraints.

```tsx
const result = await publicCreate<PublicContact, CreateContactInput>(
  "/api/v1/public/contacts", values
);
if (!result.body) {
  setError(result.message ?? "Unable to save contact");
  return;
}
await queryClient.invalidateQueries({ queryKey: ["public-contacts"] });
onSuccess(result.body);
```

This extract assumes the surrounding form handles pending cleanup with `finally`. Never put “reset and close” unconditionally in `finally`: it runs on failure too. That was part of the original contact form’s bad experience.

## Exercise and answer
Submit an email that already exists. The modal should remain open, the typed name and phone should remain present, and the API error should be visible. Correct the email and submit again without retyping everything. This test verifies a real user outcome, not just whether a callback was invoked.

## Design checkpoint
Use a clear “Saving…” label and keep errors near the form. Do not display success before the response arrives unless you intentionally implement optimistic updates with rollback behavior.

:::refs docs/frontend/forms, https://tanstack.com/query/latest/docs/framework/react/guides/mutations

# Editing and clearing fields
Editing begins with current values, not blank defaults. If the same modal component is reused for different contacts, reset it when the selected record changes. Include the profile reference even if the public form does not offer upload controls.

```ts
const defaults = {
  name: contact.name,
  email: contact.email ?? "",
  phone: contact.phone ?? "",
  profile: contact.profile ?? null,
};
```

The actual update helper uses PUT and can include the contact’s version. The API must use a map or equivalent mechanism that persists deliberate empty values. Otherwise clearing a phone may look successful but leave the old value stored.

After success, invalidate both directory and detail queries so either screen shows the new name. If the update fails, keep the modal and draft. If the underlying contact disappears, explain that separately from an invalid email.

## Exercise and answer
Edit only the phone of a contact with a photo. Confirm that the photo remains. Then clear the email and save. Reload from the API and verify the empty-email policy. Finally, repeat with two open tabs to observe the version conflict path.

:::refs docs/backend/concurrency, https://react-hook-form.com/docs/useform/reset

# Delete is a distinct interaction
Deletion needs a clear target, a confirmation step and a predictable destination afterward. Show the contact’s name in the confirmation so the visitor can catch a mistaken selection. Disable the action while the request is pending.

```tsx
await deletePublicContact(contact.id);
await queryClient.invalidateQueries({ queryKey: ["public-contacts"] });
queryClient.removeQueries({ queryKey: ["public-contact", contact.id] });
router.push("/contacts");
```

Use the project’s actual detail key; this snippet illustrates the sequence. On a directory page, you may stay on the list instead of navigating. If deleting the last card on a later page, move to a valid page or refetch with corrected pagination.

The API performs a soft delete. The item disappears from ordinary public reads, but the row remains for retention or recovery policies. A deleted email may still conflict with a unique index.

## Exercise and answer
Cancel the confirmation and prove no DELETE request was sent. Then confirm one deletion using a disposable contact, reload the directory and open its old detail URL. The page should show an unavailable-record state rather than spin forever or crash while reading null.

:::refs https://gorm.io/docs/delete.html, docs/backend/public-api

# Search, sorting and pagination
Search input changes quickly; database requests are comparatively expensive. A short debounce can reduce needless requests. Keep the immediate draft separate from the debounced query value, and reset the page to one when search or sort changes.

```ts
const params = new URLSearchParams({
  search,
  sort_by: "name",
  sort_order: "asc",
  page: String(page),
  page_size: "12",
});
```

The server decides which fields are searchable and sortable. The contact public list searches name, email and phone and allows a limited sort set. Pagination metadata should come from the response, not from guessing how many records exist based only on the current array.

## Exercise and answer
You are on page 8, then search for a unique name. Why might the screen look empty? The matching record may be on page 1 while the client still requests page 8. Reset pagination when the result set changes.

## Extension
Persist filters in URL search parameters if users need shareable searches and browser back-button behavior. Define one source of truth to avoid a loop between URL state and local state. Consider cursor pagination only when the data size and ordering requirements justify it.

:::refs docs/backend/pagination, https://nextjs.org/docs/app/api-reference/functions/use-search-params

# Detail pages and missing records
A detail route should not assume the ID is valid or that the row still exists. The current server page awaits params and passes the ID to a client detail component. That component owns pending, error, missing and success rendering.

```tsx
if (query.isPending) return <DetailSkeleton />;
if (query.isError) return <RetryPanel onRetry={() => query.refetch()} />;
if (!query.data) return <MissingContact />;
return <ContactProfile contact={query.data} />;
```

For a fully server-rendered detail page, you can call Next.js `notFound()` when the API returns 404. That integrates with `not-found.tsx`. Do not catch every server error and convert it into notFound: an outage is not a missing contact.

Use meaningful email and phone links only when values exist. Long names and addresses should wrap without forcing horizontal scrolling. The detail view should expose Edit and Delete consistently with the directory’s public access policy.

## Exercise and answer
Test a real ID, a random UUID and a stopped API. Expect success, missing and retryable failure respectively. Those three tests expose most accidental “null means everything” helper designs.

:::refs https://nextjs.org/docs/app/api-reference/functions/not-found

# Know which cache you are changing
There are several independent caches: browser/HTTP caches, Next.js server data caching, React request memoization and TanStack Query’s client cache. An instruction at one layer does not invalidate every other layer.

The contact public GET handlers set `Cache-Control: no-store`, and the fetch helper requests `cache: "no-store"`. Query invalidation still matters because the browser UI can retain data in TanStack Query. React `cache()` around an async function is not a substitute for client query state or mutation invalidation.

## A practical debugging sequence
1. Inspect the mutation response and returned contact.
2. Inspect whether the list query was invalidated.
3. Inspect the next GET response body.
4. Compare response data with rendered data and active query key.

If the GET body is current but the card is old, look at client state and memoization. If the GET body is old, look at API/database selection and HTTP/server caching. Do not keep adding random cache-busting timestamps without locating the stale layer.

## Exercise and answer
Does `router.refresh()` necessarily clear a TanStack Query cache? No. It refreshes the Next.js route’s server component payload. Invalidate the query cache that actually owns this directory’s data.

:::refs https://nextjs.org/docs/app/guides/caching, https://react.dev/reference/react/cache

# Images are data plus delivery
A profile photo involves a database reference, storage object, URL resolution, HTTP response and rendering element. A broken image can originate at any one of these layers.

```ts
const resolved = new URL(profile.url, apiBase).toString();
```

Use the actual FileRef URL property from the shared type. Resolve relative URLs against the API origin, not the web origin. Accept expected HTTP/HTTPS URLs and fall back to initials for absent or failed images. Reset an error fallback when the source changes.

The observed contact-image failure came from the API’s working directory: local storage files existed under `apps/api/storage/app`, while the process had been launched from the repository root. Starting it from `apps/api` made the intended files available. An image component cannot repair a server 404.

Next Image optimization has separate remote-host configuration requirements. The current avatar uses its own image/fallback logic; do not describe this incident as an optimizer fix. The public form preserves an existing profile; it does not implement a new public upload endpoint.

## Exercise and answer
Open the image URL directly. If it is 404, inspect storage and routing first. If it is 200 but blocked in-page, inspect browser policy, mixed content and rendering. If the URL is absent, test the initials fallback.

:::refs https://nextjs.org/docs/app/getting-started/images, docs/backend/storage

# Environment variables and browser boundaries
Next.js exposes variables prefixed with `NEXT_PUBLIC_` to browser code. They are commonly embedded during build, so changing a production environment variable may require rebuilding the frontend. A server-only internal API origin must remain usable from the execution environment that reads it.

The contact helper prefers `API_INTERNAL_URL` when available, then the public API URL, then localhost. In browser execution only the public configuration is available. Verify both paths when deploying behind containers or proxies.

```text
NEXT_PUBLIC_API_URL=https://api.example.test
NEXT_PUBLIC_API_KEY=<publishable project key>
```

This is a template, not a real credential. Do not copy database passwords, admin credentials or private storage keys into client-prefixed variables. A public API key is visible by design; it does not identify the person making a public edit.

## Exercise and answer
The website works on the developer’s machine but calls localhost for another visitor. What went wrong? The browser bundle contains a local API origin. Set the correct public origin at build time and confirm the deployed Network panel, CORS origins and HTTPS scheme.

:::refs https://nextjs.org/docs/app/guides/environment-variables

# Test what the visitor experiences
Frontend tests should verify outcomes: a failed save preserves input, a successful save invokes the success flow, an avatar uses a fallback, and a missing detail has a useful state. Mock the network boundary when testing components, then use an end-to-end smoke test for the full stack.

```powershell
Set-Location apps/web
pnpm exec vitest run __tests__/contact-form.test.tsx __tests__/contact-avatar.test.tsx
```

These focused contact tests passed in the earlier app work. The full web TypeScript check had an unrelated pre-existing failure in `lib/todos-public.ts:144`, where a helper call lacked arguments. A passing focused test is not a passing repository-wide build; keep that distinction in your notes.

## Exercise
Add a test in a practice branch proving that a 409 response keeps the entered name visible. Then change the implementation to reset unconditionally after submission. Confirm the test fails for the right reason, and restore the correct behavior.

## Answer
The assertion should observe the draft and error message, not an internal state variable. This protects the user experience even if the form library or callback organization changes later.

:::refs https://testing-library.com/docs/react-testing-library/intro/, docs/testing

# Debugging lab: the misleading 409
The original symptom was a conflict on every web submission and an empty contact row. The browser payload was correct. The running API did not match the edited source: an empty request returned 409 before restart and validation failure after rebuild/restart. That is evidence of stale runtime behavior, not proof of the exact bug inside the old executable.

There was also a persistence rule to correct: optional Go strings can become `""`, and repeated empty emails can collide with a unique index. The service now omits absent email on creation, and the public update can write NULL on clearing. The form now preserves a failed draft.

## Work the investigation
1. Capture the exact request body and response.
2. Confirm which process owns the API port and which source it runs.
3. Send invalid and valid payloads directly to isolate the browser.
4. Inspect the actual database and email column constraints.
5. Test two absent emails and two identical non-empty emails.
6. Verify the UI’s error and success behavior separately.

## Answer key
Deleting the blank row alone hides a symptom. Removing the unique index changes the product rule. Making the frontend email required avoids one path but does not fix API correctness. The durable repair aligns binding, normalization, persistence, process startup and visible feedback.

:::refs docs/backend/error-handling, docs/backend/validation

# Capstone and reference desk
Build a fictional directory with three contacts. One has no email, one has an email and phone, and one has an admin-uploaded photo. Demonstrate create, search, sort, pagination, detail, edit, clear email and delete. Use only disposable data for destructive tests.

## Explain these decisions aloud
- Why a shared Zod schema does not validate Go requests.
- Why an optional string can still violate a unique index.
- Why a public key is not an administrator credential.
- Why a loading.tsx file does not cover every client fetch.
- Why query invalidation and HTTP cache headers solve different problems.
- Why a soft-deleted row can still occupy an email value.
- Why a storage path can change when the working directory changes.

## Reference vocabulary
A DTO is a boundary-specific data shape. A receiver attaches a method to a Go type. An interface describes behavior. A context carries cancellation. A transaction groups database changes. A query key identifies cached server state. A skeleton represents pending content. An allowlist declares what input or output is permitted. A migration changes database structure; a seed adds starting data.

## Next step
Move to Book 2 to learn how Grit generates and connects these pieces. Keep the request trace from lesson 2 beside you: every generator command ultimately produces ordinary code that participates in those same boundaries.

:::refs https://go.dev/doc/, https://nextjs.org/docs, https://tanstack.com/query/latest/docs/framework/react/overview, docs/start
