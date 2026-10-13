# What Grit gives you
Grit generates application code you own: Go models, services, handlers and routes; shared TypeScript types and Zod schemas; frontend hooks; and an admin resource interface. Its main advantage is that these pieces begin connected. You still design the product’s behavior and verify the generated boundaries.

This course uses the contact application throughout. The main path builds a Go API with separate Next.js admin and web applications. Later lessons explain the additional systems Grit ships and give focused experiments. They are optional extensions to the contact app, not prerequisites for a working directory.

## How to use this book
Read Book 1 if Go or the Next.js App Router is unfamiliar. Work through installation, generation and the admin first. Then build the public web surface. Book 3 supplies the exact implementation and companion files; this book explains why each Grit step exists.

The inspected app records Grit 3.397.0; the archived documentation identifies 3.398.0. Commands and generated paths can evolve. Preserve the version and read command help before applying a tutorial to a newer scaffold. The references in this book are live links; the bibliography records the research date.

## First exercise
Write down what Grit generates and what the contact app adds. Generated: the resource stack and protected admin machinery. Custom: anonymous public writes, directory design, detailed web states, edit/delete flows and the optional-email persistence repair. This distinction will prevent you from expecting a flag to implement a product policy it does not promise.

:::refs docs/start, docs/getting-started/philosophy, blog/why-i-built-grit

# Prepare Windows for the course
Install Go, Node.js and pnpm, then open a new PowerShell session so PATH changes are visible. The existing project declares Go 1.26.9, Next.js 16.3.8 and pnpm 10.33.4. Follow package and module requirements rather than an older article’s minimum versions.

```powershell
go version
node --version
pnpm --version
Get-Command go
Get-Command node
Get-Command pnpm
```

Go may download the module’s required toolchain if automatic toolchain selection is enabled. A root-directory `go version` can therefore differ from the toolchain selected inside `apps/api`. Inspect `go.mod` and `go env GOTOOLCHAIN` when diagnosing a mismatch.

SQLite keeps the introductory database setup small. Docker becomes useful for services such as PostgreSQL, Redis and object storage; it is not necessary to pretend that every optional integration is healthy before learning CRUD. Check the selected storage and queue behavior explicitly.

## Exercise and expected result
Record versions in a lab journal. Run the commands both at the repository root and inside `apps/api`. Explain which output changes and why. If a command is missing, fix PATH or install that tool before scaffolding; a half-installed toolchain creates confusing downstream errors.

:::refs docs/getting-started/prerequisites, docs/prerequisites/golang, docs/prerequisites/nextjs, docs/prerequisites/docker

# Install and verify the CLI
The Go installation path is straightforward when Go is already available:

```powershell
go install github.com/MUKE-coder/grit/v3/cmd/grit@latest
grit version
grit --help
```

If `grit` is not found, inspect `go env GOPATH` and ensure its `bin` directory is on PATH. Open a fresh terminal after changing PATH. The official Windows installer is another documented route; inspect the downloaded script if using that route in a managed environment.

`@latest` installs the current release, which may differ from this book’s reference project. For exact reproduction, use a release tag that exists upstream and matches your chosen baseline, or preserve a copy of the generated project and lockfile. Do not silently assume latest means 3.397.0 forever.

## Exercise and answer
What does `grit update` change? The CLI executable. What does `grit upgrade` change? Generated project code, when run inside a project. Installing a newer CLI does not automatically patch an application that was generated months ago.

## Checkpoint
You should be able to locate the installed executable, print its version and inspect help without launching the application. Save that version beside your scaffold command so later differences are explainable.

:::refs docs/getting-started/installation, docs/cli, docs/upgrades

# Choose the triple architecture
The triple architecture separates API, public web and admin. That fits this project: the public site has its own design and anonymous CRUD policy, while staff work in the generated admin. The applications share code where appropriate without becoming one process.

```powershell
# Run in a separate practice parent, not inside the existing app.
grit new todo-app --triple --next --db sqlite
Set-Location todo-app
pnpm install
```

Use the same project name in a different parent directory if you want the companion’s Go import prefix to match. If you choose another name, update module imports deliberately rather than copying files with the old prefix.

Single, double and API-only modes make different tradeoffs about frontend surfaces. Mobile and desktop add their own client toolchains. Do not choose all architectures merely because they exist; each adds build, testing and release responsibilities.

:::diagram apps/web: public contact experience | apps/api: shared data and policy | apps/admin: protected management

## Exercise and answer
Why not put the database password in `packages/shared`? Shared frontend packages can enter browser bundles. Shared types are appropriate; server credentials are not. Architecture is also a trust boundary, not only a folder arrangement.

:::refs docs/concepts/architecture-modes/triple, docs/getting-started/create-a-project

# Read the generated project
Before changing files, locate the entry points and configuration. `apps/api/cmd/server` starts the Go service. `apps/api/internal` contains application packages. `apps/web` and `apps/admin` contain their own routes and components. `packages/shared` carries frontend contracts.

```powershell
Get-Content grit.json
Get-Content apps/api/go.mod -TotalCount 25
Get-Content apps/web/package.json
Get-Content package.json
```

`grit.json` records generator choices. The lockfile records dependency resolution. The `.grit` directory records generation/upgrade ownership. Keep these files when moving the project; they are part of reproducibility.

Environment files may be generated at scaffold or setup time and can contain secrets. They are local configuration, not teaching assets to publish. The companion contains selected source files only, with no database or real credentials.

## Exercise
Find the API route registration, the shared schema exports and the admin resource registry. Draw a path from one Contact field to its Go model, Zod schema and admin input.

## Answer
A resource is represented in several ordinary files. Knowing their roles lets you distinguish a missing generated registration from a runtime validation failure. Editing one file may be insufficient when the change crosses a boundary.

:::refs docs/getting-started/project-structure, docs/concepts/generated-files

# Start with a verified baseline
Run the generated setup before adding custom code. A migration changes database structure; seeding populates initial users and sample/setup data. Development startup launches the services configured for the project.

```powershell
grit migrate
grit seed
grit start
```

Read the terminal output for the actual ports and setup instructions. Do not assume a port from another tutorial is free. Verify the admin login and web landing page, then check the API health response and startup logs.

The current project’s image incident shows why launch location matters. A manually launched API should run from `apps/api` when using the generated relative local-storage path. If a watcher fails to rebuild, a running server can continue answering with old code.

## Exercise and answer
Change no application code yet. Create a baseline note containing CLI version, database driver, service URLs and successful startup observations. If the admin cannot load users, fix that baseline first; adding Contact code will not repair a broken database connection or missing API configuration.

> A green terminal build and a working browser request prove different things. Check both before continuing.

:::refs docs/getting-started/quick-start, docs/backend/migrations, docs/backend/seeders

# Design Contact before generating it
The minimum contact has a name, optional unique email, optional international phone and optional profile photo. The ID is a UUID string. The model also has generated timestamps, version and deletion-related fields that support infrastructure behavior.

```powershell
grit generate resource Contact --fields "name:string,email:email:unique,phone:tel:UG,profile:file:image" --public
grit migrate
```

The phone option chooses Uganda as the default parsing/picker country; it does not restrict every contact to Uganda. The file field is a structured reference, not the image’s raw binary content.

Review generated requiredness. The real app deliberately permits absent email and phone and contains custom normalization/persistence fixes. The generator command is a baseline, not proof that every later product rule is already implemented. Inspect the generated request and schema before submitting data.

## Exercise and expected result
Find the new Go model, service, handlers, routes, shared types/schema and admin resource definition. Open Contact in the admin and create a fictional record. Only after protected CRUD works should you extend the public web behavior.

:::refs docs/concepts/field-types, docs/concepts/code-generation, docs/tutorials/contacts/web

# Field types: choose meaning over appearance
A field type drives more than a widget. `email`, `tel`, `url`, `country` and `money` encode domain intent that can affect normalization, validation, seed data and rendering across the stack.

- Text: string, text and richtext; choose based on content and editing needs.
- Numbers: int, uint and float; use money for currency calculations.
- Choices: select, radio and check with declared options.
- Time: date, datetime and time have different meanings.
- Files: file and files hold one or several structured references.
- Relationships: belongs_to and many_to_many connect resources.
- Structured data: json and string_array hold flexible values with tradeoffs.

```text
status:select:active=Active|archived=Archived
company:belongs_to:Company
tags:many_to_many:Tag
website:url
notes:text:encrypted
```

These are reference fragments, not changes required for the base contact app. Current relationship foreign keys are UUID strings. Encrypted text is stored encrypted at rest but is plaintext in application code and authorized API responses; encryption is not an authorization rule.

## Exercise and answer
Would you store a phone as an integer? No. Formatting, country prefixes and leading digits are not arithmetic. Use tel and verify E.164 normalization with the generated helpers.

:::refs docs/concepts/field-types, docs/concepts/money

# Models, services and handlers
The model declares persistence shape. A service implements reusable data operations and business behavior. A handler translates an HTTP request into service calls and responses. Keep each layer focused so admin, public and future clients can share the right behavior.

In Contact, the public handler trims and validates the name, constructs the model and calls the existing service. The optional-email insertion policy belongs in the service because both public and protected creation should obey it.

## Read the generated code in order
1. Model fields, tags and lifecycle hooks.
2. Service Create and Update behavior, including transaction and scope.
3. Request DTOs and error conversion in the handler.
4. Route group and permission registration.
5. Response shape and frontend helper.

## Exercise and answer
Where should you put a rule that all contact names must be trimmed? Normalize at a shared boundary used by the relevant writes, and ensure direct service callers are considered. A public-only handler fix leaves admin behavior potentially different. The current case study shows the public validation explicitly; use integration tests to identify remaining parity work before claiming universal enforcement.

## Checkpoint
Explain why directly inserting a model from a new handler can bypass service-side auditing, concurrency or file handling. Reuse the existing service unless you intentionally need a different invariant.

:::refs docs/backend/models, docs/backend/services, docs/backend/handlers

# Generated code and code you own
Grit tracks generated files and uses marker comments or generated regions for injections. Preserve those markers. The admin’s generated resource definition and its custom companion have different lifecycles.

```text
apps/admin/resources/contacts/
  contacts.ts
  contacts.custom.tsx
```

Use the custom file for supported overrides. A generated region may be rewritten by regeneration; an owned customization file is designed to survive it. Read the current documentation and local file comments, since layouts changed across Grit releases.

The `.grit/manifest.json` records hashes so upgrades can distinguish unchanged, modified and untracked files. Editing a pristine generated file can mean a future upgrade leaves it alone and asks for a manual merge. That is a manageable maintenance choice when recorded.

## Exercise and answer
You want a colored badge in the admin table. Should you replace the entire generated page? Start with the smallest supported customization, such as a cell override in the custom resource configuration. Preserve the existing query, pagination and action machinery unless the design truly requires replacing it.

:::refs docs/concepts/code-generation, docs/admin/custom-pages, blog/your-table-our-machinery

# Understand the admin resource
The admin resource definition connects labels, columns, form fields, permissions and data behavior. It gives staff a usable CRUD surface quickly, including capabilities such as sorting, pagination, import/export and bulk operations where supported by the generated resource.

Open the actual Contact resource and compare its columns with the shared type. A profile field should render through the file-aware machinery. A phone field should use its intended input and formatting rather than being treated as an arbitrary number.

## Mini-lab
Create two fictional contacts in the admin. Search by name, sort, open one record and edit it. Verify the request goes to the protected contact routes rather than the public routes. Sign out and confirm staff pages no longer grant the same access.

## Expected result
Admin authentication and authorization protect staff capabilities. The separate public API still permits the explicitly chosen public actions. A successful anonymous public edit does not mean the admin permission system is broken; it means two surfaces have different policies.

## Design extension
Rename a column label or improve a cell display in the custom file. Keep the stored property names stable. A human-friendly label does not require renaming the database column, JSON property and every consumer.

:::refs docs/admin/overview, docs/admin/resources, docs/admin/datatable

# Forms, relationships and multi-step flows
Grit’s admin form system chooses controls from field metadata. A relationship selector should fetch valid related records, and the API should validate the selected foreign key. A good UI alone cannot guarantee referential integrity.

For a contact extension, generate Company first, then add a belongs_to relation from Contact in a disposable exercise project. Inspect the UUID foreign-key field, shared schema and selector. Decide whether a company is required and what happens when it is deleted.

Multi-step forms divide a long input task into stages. They still need a coherent final payload, validation timing and draft policy. Do not introduce steps for a three-field contact form simply because the feature exists.

## Exercise and answer
Can a user submit a related ID they cannot see in the picker? They can craft a direct HTTP request. The server must enforce relationship access and tenant/owner boundaries where those exist. A filtered dropdown is helpful feedback, not a complete security boundary.

## Practical checkpoint
Try selecting a related record, changing it, clearing it when optional and submitting an invalid ID directly. Verify the API response and ensure the form preserves the draft on rejection.

:::refs docs/admin/forms, docs/admin/relationships, docs/admin/multi-step-forms

# Customize the admin in small steps
The customization system supports increasingly broad overrides: adjust labels or cell rendering, replace a form or table slot, and only then replace the whole page when needed. The goal is to retain existing data behavior while changing presentation.

The blog “Your table, our machinery” demonstrates this progression. Its key design lesson is to stop at the smallest override that solves the user’s problem. Reimplementing pagination, URL state, toasts and cache invalidation creates work that a visual change may not require.

## Mini-lab
Add a compact avatar-and-name cell to the Contact custom resource configuration using the installed version’s documented slot interface. Check long names, missing images and keyboard focus. Review the generated types for the slot props rather than inventing an API from an older example.

## Expected result
The table retains its working search and actions while the chosen cell improves. If the markup renders but styles are missing, inspect Tailwind’s source scanning for the resources directory; the blog documents this historical failure mode.

## Extension
Add a custom dashboard widget only when it answers a staff question, such as how many contacts have no email. Compute that metric on the server for large datasets rather than counting one paginated page in the browser.

:::refs docs/admin/custom-pages, docs/admin/widgets, blog/your-table-our-machinery

# Public reads are an explicit surface
The `--public` resource option generates public list/detail reads, a response allowlist and frontend helpers. It does not promise anonymous create, update and delete. Those writes in our contact app are custom additions.

```text
GET /api/v1/public/contacts
GET /api/v1/public/contacts/:key
```

The public mapper prevents future model fields from automatically becoming visible. The service’s public scope decides what counts as available. Do not let query-string filters override visibility or deletion policy.

The generated public key setup can write the web environment file during seeding. Use your own project key; do not paste a real key from someone else’s tutorial. Confirm the request header expected by the middleware in your generated version.

## Exercise and answer
Add a private note to a practice model without adding it to the public DTO. It should remain absent from the public GET response. If you return the entire model in a custom handler, you have bypassed that protection and must review the response fields yourself.

:::refs docs/backend/public-api, docs/tutorials/contacts/web

# Extend public access to CRUD
Our product decision is explicit: anyone using the web app may create, edit and delete contacts without signing in. Implement this at the server route layer, not by reusing staff hooks that require authentication.

```go
m.Public.POST("/contacts", h.PublicCreate)
m.Public.PUT("/contacts/:key", h.PublicUpdate)
m.Public.DELETE("/contacts/:key", h.PublicDelete)
```

Each write still needs binding, validation, service reuse and correct responses. Update and delete first check the public scope. The API key middleware still applies, but the key is publishable and does not distinguish individual visitors.

## Mini-lab
Create a contact in an incognito browser window, edit it and delete it. Then attempt a protected staff route without authentication. The public actions should work with the configured public key, while the staff surface should reject missing authorization.

## Expected result
The access model is consistent across UI and HTTP. If the product later changes to private personal contacts, add user authentication and ownership checks across list, detail and mutations; hiding buttons or changing the frontend URL is insufficient.

Book 3 provides the actual handlers and routes. Keep public upload as a separate feature decision: the current web form displays and preserves photos uploaded through admin, but does not add an anonymous binary-upload flow.

:::refs docs/backend/public-api, docs/security/authorization

# Connect the Next.js web app
The public web application needs its own data helper because its endpoint and access model differ from the admin. Define the public response shape, construct URLs safely, handle HTTP errors and expose list/detail/mutation functions.

```text
apps/web/lib/contacts-public.ts
apps/web/components/contacts/contacts-directory.tsx
apps/web/components/contacts/contact-detail.tsx
apps/web/components/forms/ContactForm.tsx
```

Use the generated QueryClient provider. The directory’s query key includes search, sort and pagination inputs. After a mutation, invalidate the matching list prefix and detail key. The current app sets no-store on public reads to avoid stale HTTP responses while still using client query state deliberately.

## Exercise and answer
Why should a failed list request throw instead of returning `[]`? An empty array says the request succeeded and found no contacts. Throwing lets the query render an error and retry action. Similarly, return null only for a genuine missing detail, not every network failure.

## Checkpoint
Inspect a list request in the browser. Confirm its origin, API-key header, query parameters, status and envelope. Only then debug the card markup if the screen looks wrong.

:::refs docs/frontend/web-app, docs/frontend/hooks, docs/frontend/shared-package

# Build a complete web experience
The custom contact directory supports cards/table presentation, search, sort, pagination, create/edit, delete confirmation and detail navigation. These are product interactions built on Grit’s generated backend, not automatic consequences of generating the resource.

Design the state matrix before styling: initial loading, refresh, error, empty database, empty search, success and pending mutation. Match skeleton dimensions to final cards. Preserve drafts after rejected submissions. Use a fallback avatar for missing or broken images.

## Mini-lab
Throttle the network, stop the API, search for a nonexistent name and submit a duplicate email. Check each state deliberately. On a narrow screen, verify that actions remain accessible and long email addresses wrap.

## Expected result
The page communicates what is happening and what the user can do next. A retry button should retry the failed query; a clear-search action should reset search and page. A delete confirmation should name the contact and send no request when cancelled.

## Reference distinction
`loading.tsx` handles route-level pending work. The client query still needs its own pending UI. A polished Grit app combines generated infrastructure with thoughtful application states.

:::refs docs/frontend/ui-components, docs/design/theme, docs/tutorials/contacts/web

# Database changes and realistic seeds
Use migrations to evolve structure and seeders to create initial or test data. Inspect the generated model and migration behavior when adding unique constraints or changing optionality. Existing rows may violate a new rule even if new forms look correct.

```powershell
grit generate field Contact website:url
grit migrate
grit sync
```

Confirm this command’s positional syntax with your installed CLI before running it; the command explorer is the reference for version-specific usage. Regeneration and sync can change shared files, so review the result and rerun relevant checks.

The CRM blog demonstrates large resumable seeding with `grit seed Contact --count 1000000`. Begin with a small disposable dataset. A million records are useful for performance experiments, but not required to learn the form and not appropriate in your working personal database.

## Exercise and answer
What would happen if you add a unique email index to rows containing many empty strings? Migration can fail or future inserts can conflict, depending on existing state and engine behavior. Inspect and plan the data transformation; do not solve it by silently deleting records.

:::refs docs/backend/migrations, docs/backend/seeders, blog/build-a-crm-with-grit

# Authentication, sessions and account security
Grit includes authentication and account-security machinery. Authentication establishes who the caller is; authorization decides what that caller can do. The public contact web surface intentionally does not require user identity, while the admin does.

Learn the generated login, token/session and logout flows before customizing them. Account security features such as TOTP, passkeys and OAuth/SSO have setup and recovery requirements beyond adding a button. Configure provider credentials on the server and verify callback URLs for the deployed origin.

## Mini-lab
In a disposable project, sign in to the admin, inspect the session/account UI, sign out and verify protected requests are rejected. If testing MFA or passkeys, establish a recovery path before removing the original login method.

## Expected result
The browser UI and server agree on session state. A cached admin page must not be mistaken for a successful authorized API request after logout. Test the network response directly.

## Contact extension
If you later want personal address books, generate or add web authentication and introduce owner scope. That is a different app policy from this book’s public directory and should be implemented across every endpoint, export and background operation.

:::refs docs/backend/authentication, docs/backend/account-security, docs/backend/passkeys, docs/backend/oauth, docs/security/sso

# Roles, permissions and ownership
Grit’s role system includes permission keys such as `contacts.view`, `contacts.create`, `contacts.edit` and `contacts.delete`. A role groups permissions. An ownership rule narrows which rows a caller may access. These are related but separate concerns.

The roles blog describes ADMIN’s broad grant and editable role/permission relationships. Read the current generated role model and middleware before assuming a role label alone is the entire policy.

## Mini-lab
Create a restricted staff role in a practice database. Grant view but not delete. Confirm the UI reflects that choice and that a direct protected DELETE request is rejected. Test authorization at the API even if the button disappears correctly.

## Expected result
Permissions control actions; owner or tenant scopes control rows. A staff member with edit permission should not automatically access every tenant’s records when multi-tenancy is enabled.

## Public-directory boundary
The custom public routes intentionally allow anonymous writes and do not inherit staff permissions. Do not accidentally document the admin’s restricted role as a restriction on those public endpoints. A policy change must remove or constrain the public surface as well.

:::refs docs/backend/rbac, docs/admin/roles, docs/security/authorization, blog/roles-permissions-and-automatic-backups

# Storage, uploads and image processing
The file field stores a FileRef, while the storage adapter stores bytes. Admin upload controls coordinate these operations. The browser then needs a reachable URL and compatible response headers to display the image.

Local storage is convenient for development. Object storage is preferable when multiple API instances must see the same files. A local fallback may allow development to proceed when a configured object store is unavailable; inspect health and logs so the actual driver is known.

## Mini-lab
Upload a small fictional avatar through admin. Inspect the FileRef, open its URL directly, then view it in the public directory. Restart the API from the expected working directory and confirm the file persists and remains reachable.

## Expected result
Both admin and web display the same reference. If the direct URL is 404, inspect storage location and routing. If direct access works but embedding fails, inspect browser policy, origin and URL resolution. Media transformations have their own resource and format constraints.

## Extension
Public uploads would require a separate endpoint policy, size/type checks, storage handling and cleanup for abandoned files. That feature is not implemented by this contact workbook; preserving an existing reference is a narrower, verified behavior.

:::refs docs/batteries/storage, docs/batteries/media, blog/everything-new-in-grit

# Email, queues and scheduled work
Email and background jobs are useful once contact CRUD is stable. A queue decouples a request from work that can retry, such as a bulk export or follow-up email. Cron schedules recurring work; it does not automatically make the work idempotent.

The generated app includes infrastructure for these features, but external services and credentials still need configuration. A local development success is not evidence that a production email provider accepted delivery.

## Mini-lab
In a practice project, follow the mail/job documentation to generate or register a small job that records a completion message. Run it, force one controlled failure and inspect retry behavior. Then consider how a contact follow-up would avoid duplicate delivery after a retry.

## Expected result
You can identify the producer, queue, worker and result/failure visibility. A detached goroutine in an HTTP handler is not a substitute for durable work because process exit loses it.

## Contact design exercise
Should saving a contact block until an external email provider responds? Usually the database write should succeed independently and durable follow-up should be queued according to the product’s requirements. If both must be coordinated, study the outbox lesson rather than pretending an external email can roll back with SQL.

:::refs docs/batteries/email, docs/batteries/jobs, docs/batteries/cron

# Caching and measured performance
Cache data only after understanding its freshness requirements. A public directory changes through multiple clients, so mutation invalidation and public read policy matter. A stale cache can make a correct database write look broken.

The scaling material emphasizes measurement before infrastructure changes. Start with request latency, query count, database indexes and connection behavior. A new Redis instance cannot repair an unbounded query or a missing sort index by itself.

## Mini-lab
Seed a modest disposable dataset, measure a contact search and sort, and inspect the query plan or database logs. Compare first load and repeated load. Keep the input and environment constant when comparing results.

## Expected result
You can name the slow layer and a measurable hypothesis. Add one change, repeat the same workload and record whether it helped. Load-test commands must target your own test environment, not the framework’s website or a production app with real users.

## Extension
Read replicas introduce replication lag; cached counters introduce invalidation; horizontal scaling introduces shared-state requirements. These are tradeoffs to address when observed demand requires them, not decorations to add to a three-contact tutorial.

:::refs docs/batteries/caching, docs/concepts/performance, docs/scaling, blog/where-a-grit-app-starts-scaling

# Realtime and presence
Realtime updates notify connected clients when server state changes. Presence communicates who is currently viewing or participating. Neither replaces durable database state or authorization checks.

The CRM blog uses a presence banner to help staff avoid contacting the same lead simultaneously. For the contact directory, a simpler extension is to invalidate a list query after a permitted contact-change event. Keep the event’s payload limited to data its audience may see.

## Mini-lab
Follow the realtime documentation in a disposable project, open two browser sessions and observe connection/reconnection. Update a contact in one and refresh the other through the event-driven invalidation path. Disconnect one session and verify it recovers through a fresh query rather than assuming no events were missed.

## Expected result
Events improve freshness, while a normal fetch remains the source of truth. Presence can be stale during network interruptions; do not use it as an exclusive lock for a critical transaction.

## Design question and answer
Can a public channel carry internal staff notes? No. Apply channel authorization and a response/event allowlist. The public CRUD policy does not imply that every field in an admin model is public.

:::refs docs/backend/realtime, blog/build-a-crm-with-grit

# Offline sync and conflict decisions
Offline support adds a local mirror, a queue of pending changes and reconciliation after reconnect. It creates a second stateful system, so conflict behavior becomes part of the user experience.

Grit has offline capabilities for supported architectures. This contact web snapshot uses ordinary online queries and mutations; do not claim it already saves edits offline. Adding offline behavior should be a separate, tested extension.

## Mini-lab
Use the documented offline setup in a disposable project. Load a contact, disconnect, edit it locally, change the server copy elsewhere and reconnect. Record whether the system rejects, merges or prompts about the competing versions.

## Expected result
The visitor can tell what is pending and what is confirmed. A successful local write is not yet a successful server write. Deletions, uploads and permission changes also need reconciliation policies.

## Exercise and answer
Why is “last write wins” not always acceptable? It can silently discard another person’s change. Version checks expose the conflict but do not decide how to merge it. For contacts, field-level merging may be possible; for money or inventory, business rules are stricter.

:::refs docs/concepts/offline-sync, docs/mobile/offline, docs/desktop/offline

# Workflows enforce transitions
A select field restricts values, but a workflow restricts transitions between values. “Active” and “archived” might be valid states while some transitions require a permission or confirmation.

The current documentation declares workflows in a resource YAML field block. The workflow specifies an initial state, terminal states and allowed transitions. Use the documented YAML shape rather than assuming a CLI field string expresses the whole process.

```yaml
- name: status
  type: select
  options:
    - { value: active, label: Active }
    - { value: archived, label: Archived }
  workflow:
    initial: active
    terminal: [archived]
    transitions:
      - action: archive
        from: [active]
        to: archived
```

This optional teaching extension deliberately omits an unarchive transition. Add one only if the business policy permits it; a terminal state and a restoreable soft delete are different concepts.

## Exercise and answer
Try to bypass the UI with a direct update. The server should enforce the workflow, not merely offer a polite dropdown. Verify the generated service integration and transition endpoint in your installed version.

:::refs docs/backend/workflows

# Outbox, sagas and webhooks
An outbox records a pending external action in the same database transaction as a business change. A worker later delivers it. This closes the gap where a row commits but the process dies before emitting its event.

A saga coordinates a multi-step process with compensating actions when a later step fails. A webhook is an HTTP delivery mechanism to another system, with signatures, retries and duplicate handling to consider. These patterns solve different problems and can work together.

## Contact extension
Imagine creating a contact must synchronize with an external CRM. Write the contact and an outbox event atomically, deliver with a stable event ID, and make the receiver or sender track duplicates. Do not hold a long SQL transaction open while waiting for an unreliable external API.

## Exercise and answer
The receiver succeeds but the response is lost. The sender retries. How do you avoid creating two external contacts? Use a durable idempotency key and stored delivery/result mapping. A retry counter alone does not prove the first attempt failed.

## Scope checkpoint
The base contact app does not require a saga. Add these mechanisms when the business process crosses durable boundaries, and test failures at every step rather than only the happy path.

:::refs docs/backend/outbox, docs/backend/sagas, docs/backend/webhooks

# Audit, privacy and access reviews
Audit logs answer who did what and when. Privacy tooling helps export or erase account-related data. Access reviews record deliberate decisions about existing grants. Their presence does not automatically define your organization’s legal or retention policy.

The relevant blog explains that access-review campaigns and erasure journal records are populated by real admin actions, not fabricated seed evidence. A data export is a read and should not be confused with an erasure record.

## Mini-lab
Use a disposable user and data set. Review the documented export shape, start an access review and observe how its items are created. Do not test irreversible erasure on a real account to populate a dashboard.

## Expected result
You can explain the origin of each record and distinguish an operational audit trail from ordinary application history. Anonymous public contact writes cannot magically identify a signed-in person who never existed in the request.

## Extension
For sensitive resources, study read auditing, append-only models and encrypted fields. Confirm how exports, search and deletion interact with those choices. Encryption at rest does not hide plaintext from authorized API consumers.

:::refs docs/security/audit-log, docs/security/compliance, docs/backend/append-only, blog/gdpr-and-access-reviews

# Security tools and feature flags
Sentinel and the generated security integrations can provide rate limiting, defensive middleware and operational visibility. They complement correct application authorization. A rate limit does not decide which contact a person may edit.

Feature flags let you expose behavior gradually or disable it operationally. Keep a server-side check for behavior that must truly be unavailable; hiding a client button with a flag does not disable the endpoint.

## Mini-lab
In a disposable environment, inspect the security configuration and doctor output. Identify which controls are active and which depend on external services. Exercise a documented low request threshold against your own local endpoint and observe the response without generating disruptive traffic.

## Expected result
You understand the configured behavior rather than assuming every scaffolded dashboard means its backing service is enabled. Record any disabled integration alongside the reason.

## Contact exercise and answer
If a flag disables public deletion, where must it be checked? At the API action as well as the UI. The current app intentionally allows public deletion; adding a flag would be a new product behavior and should have tests for both states.

:::refs docs/batteries/security, docs/security/doctor, docs/backend/feature-flags, docs/security/defenders-handbook

# Imports, exports, PDFs and bulk actions
Generated admin resources provide productive data operations beyond one-record CRUD. Imports need validation and error reporting; exports need the same access scope as interactive reads. Bulk operations need a clear definition of partial versus atomic success.

The contact admin can expose CSV import/template, export, PDF and bulk endpoints through protected routes. The custom public web app does not automatically publish every one of those endpoints.

## Mini-lab
Export a small fictional contact set, inspect the header names and import a modified copy into a disposable database. Include one invalid email and observe whether the system reports the failing row and what it does with valid rows. Test a duplicate rather than assuming import bypasses uniqueness.

## Expected result
You know the accepted format, validation result and scope. A CSV export of only the visible page differs from an export of all filtered records; label that behavior accurately.

## Extension
Large exports may belong in a background job with a downloadable result. Avoid loading millions of records into browser memory. A resource PDF is a document feature; it is separate from the instructional books you are reading now.

:::refs docs/admin/datatable, docs/backend/handlers, docs/admin/trash

# Money, invoices, sequences and variants
These features extend CRUD into richer domains. Money stores integer minor units with a currency code. Invoice line items group related edits. Sequences provide server-generated identifiers. Variants model combinations such as size and color with their own stock or price.

```text
price:money
number:string:auto:INV
customer:belongs_to:Contact
```

These fragments belong in a separate invoice/store exercise, not the base Contact resource. A display number is not the database UUID. A currency amount is not safely modeled as a floating-point total merely because JavaScript uses number.

## Exercise and answer
Why generate invoice numbers on the server? Multiple clients can create invoices concurrently; a browser counter cannot coordinate them. Inspect the documented sequence transaction/reset semantics, and test concurrent creation in a disposable database.

## Reading lab
Compare the invoice and storefront blog articles with the current docs. The storefront article includes historical hand-written payment code and notes the later Stripe plugin. Prefer the current plugin contract when implementing it, while using the article to understand server-calculated amounts and signed webhook settlement.

:::refs docs/concepts/money, docs/backend/invoices, docs/backend/variants, blog/build-an-invoice-app-with-grit, blog/build-a-storefront-with-grit

# Plugins and multi-tenancy
Grit plugins generate code into your repository. The plugin lockfile records created files and injections so supported removal can reverse them. Generated code remains yours to inspect and maintain.

```powershell
grit plugin --help
grit plugin add multitenant
```

Run the add command only in a separate extension exercise after committing or backing up the baseline. Multi-tenancy changes data access and membership assumptions; it is not just an admin theme.

The documented plugin catalog includes capabilities such as multi-tenancy, impersonation, command palette, saved views, Stripe, push, device pairing and video. Each has its own external services, permissions and lifecycle. Review the current plugin page before choosing one.

## Exercise and answer
How do you verify a tenant boundary? Create two test tenants and attempt cross-tenant list, detail, update, export and relationship selection. Hiding another tenant in a selector is insufficient if direct requests still access it.

## Authoring extension
Study plugin authoring after you understand resource generation and ownership. A useful plugin has explicit generated files, injection points, configuration and removal behavior. Do not assume an old blog’s future community-install syntax is available without checking the current CLI.

:::refs docs/plugins/overview, docs/plugins/authoring, docs/plugins/multitenant, blog/grit-plugins-what-they-are-and-how-to-build-one

# AI workflows and localization
Grit provides an AI skill, LLM-oriented documentation and MCP-related guidance so coding tools can understand its conventions. Those resources help an assistant locate generated boundaries; they do not replace inspecting the actual version and testing changes.

For a useful coding request, specify the resource, access policy, exact desired behavior and acceptance checks. For example: “Add public contact editing, preserve profile references, return validation errors without closing the form, and test cleared email.” That is more actionable than “make CRUD work.”

AI application features are separate from AI-assisted development. An AI integration may need provider credentials, cost controls and explicit handling of user-provided content. Keep provider secrets on the server.

Localization affects UI labels, validation messages, dates and number formatting. `grit add i18n` adds the documented localization setup; it does not translate every custom string you later write.

## Exercise and answer
Find every custom contact error message and button label before adding a second language. Which need translation keys? All user-visible custom text, including empty/error states and confirmation messages. Stored contact names should not be machine-translated just because the interface language changes.

:::refs docs/ai-skill, docs/ai-workflows/llms-txt, docs/ai-workflows/mcp, docs/batteries/ai, docs/frontend/i18n

# Health, Pulse and operational diagnosis
Health endpoints report whether the app and its dependencies are usable. Pulse provides observability into requests and performance. Logs, traces and metrics answer different questions: what happened, where time was spent and how behavior changes over time.

## Mini-lab
Load the contact directory, trigger a validation error and inspect the corresponding API evidence. Then make one optional dependency unavailable in a disposable environment and observe whether health reports degraded, off or failed behavior according to its configuration.

## Expected result
You can connect one browser request to its server-side outcome without dumping private contact data into logs. Log identifiers and relevant error context rather than entire payloads by default.

## Debugging decision
If every request is fast but images fail, request the image URL and inspect storage health. If only sorted list queries are slow, inspect their query plan. If the handler appears unchanged after editing, confirm the running binary. Observability helps narrow the failing boundary; it should not become a dashboard you never use.

## Extension
Protect operational dashboards according to their intended audience. Their existence in a scaffold is not a reason to make every diagnostic surface publicly reachable.

:::refs docs/backend/health, docs/backend/pulse, docs/backend/api-docs

# Test and diagnose the generated app
Use focused tests for the feature you change, then the project’s required checks. The contact work includes integration tests for public handler behavior and component tests for form/avatar behavior. A browser smoke test proves the processes and configuration work together.

```powershell
Set-Location apps/api
go test -tags integration ./internal/handlers -run TestContact -count=1
Set-Location ../web
pnpm exec vitest run __tests__/contact-form.test.tsx __tests__/contact-avatar.test.tsx
```

The earlier focused checks passed. A repository-wide web type check had a pre-existing error in `lib/todos-public.ts:144`. Document that limitation rather than reporting the whole app as clean. Fix unrelated issues as their own explicit work when preparing a release.

## Exercise and answer
What does a test that mocks the service not prove? It does not prove actual database uniqueness, migration behavior or storage paths. Use an integration test or controlled smoke test for those boundaries.

## Checklist
Test the happy path, rejected input, duplicate value, absent optional value, missing record, stale version and unreachable API. Keep destructive tests isolated from real contacts.

:::refs docs/testing, docs/getting-started/troubleshooting, docs/security/doctor

# Upgrade without losing your application
Grit distinguishes CLI updates from project upgrades and tracks file ownership through its manifest. Review an upgrade before applying it to a customized app.

```powershell
grit update
grit upgrade --diff
grit upgrade --plan
```

The current documentation describes unchanged generated files as replaceable, modified files as conflicts to review and untracked files as yours. A plan describes repairs that need judgment. Preserve generated markers so supported injections remain discoverable.

`--force` can overwrite edits; it is not a routine cure for a conflict. Use a clean backup or version-control checkpoint and compare the result. The original workspace used for these books was not a Git repository, so the companion includes file hashes instead of pretending a git diff existed.

## Exercise and answer
A modified public handler is skipped during upgrade. Does that mean it received the new security fix? No. Protected ownership prevents overwriting your work, but it also means you must merge relevant changes manually and rerun the feature tests.

## Changelog habit
Read changes that affect your generated version, then identify the concrete files and behavior they touch. A long list of releases is not a substitute for a migration checklist for your app.

:::refs docs/upgrades, docs/changelog, docs/versioning

# Deploy, back up and restore
Deployment requires a production build, real origins, server-side secrets, persistent database/storage and a repeatable startup method. Configure CORS and public API URLs for the deployed web origin. Ensure local uploads survive process restarts or use shared object storage where appropriate.

Backups are useful only when restore is understood and tested. Database backup and file backup may be separate operations. Restoring a database without its referenced uploads can leave every avatar broken.

## Rehearsal
Use a staging environment with fictional data. Build the apps, run migrations deliberately, verify admin login and anonymous public CRUD, then test a backup/restore into another disposable environment. Compare a contact and its image before and after.

## Expected result
The deployed browser calls the public API origin rather than localhost. Health reflects dependencies. The API working directory and storage paths are stable. A restored environment contains both records and their required objects.

## Scope checkpoint
This book does not deploy your current app or change its infrastructure. The deployment references cover supported targets and commands; choose one only after the release checks and configuration are concrete.

:::refs docs/deployment/checklist, docs/deployment/environment, docs/deployment/build-locally, docs/batteries/backups

# Command and field reference
Use this as a map, then read `--help` for exact flags in your installed version. Commands that write files or data deserve a checkpoint before execution.

- Scaffold: `grit new`; conventions: `grit init`.
- Generate: `grit generate resource`, `field`, `seeder`, `sequence`, `perf`.
- Add capabilities: `grit add role`, `web-auth`, `i18n`, `offline`, `variants`.
- Expose web pages: `grit expose form` and `grit expose table`; review their access model.
- Develop: `grit start`, `grit routes`, `grit studio`, `grit sync`.
- Data: `grit migrate`, `grit seed`, `grit backup`, `grit restore`.
- Operations: `grit down`, `grit up`, `grit deploy`; inspect doctor/scale help for diagnostics.
- Maintain: `grit version`, `grit update`, `grit upgrade`.
- Plugins: inspect `grit plugin --help` before add/remove operations.
- Desktop: `grit new-desktop`, `grit compile`, `grit package` for the relevant architecture.

Field declaration anatomy is `name:type:options/modifiers`, with commas between fields. Use YAML when nested configuration such as workflows becomes clearer than an inline string. String requiredness, relationship UUIDs, encrypted fields and money all deserve a look at the current field reference before generation.

## Exercise
For each command you intend to run, write whether it changes source, data, processes or only output. This simple classification helps you choose a safe practice environment and the right verification.

:::refs docs/cli, docs/getting-started/cli-cheatsheet, docs/concepts/field-types

# Read the complete blog collection
The research snapshot contains all 13 articles listed in the site sitemap at retrieval. Use this reading route to connect them to the course; historical examples can differ from current generated code.

- “Why I built Grit”: the motivation for generated infrastructure; lesson 1.
- “Build your first Grit app”: resource and relationship fundamentals; lessons 7–12.
- “Build a CRM with Grit”: semantic fields, large seeds and presence; lessons 8, 18 and 24.
- “Everything new in Grit”: admin usability, trash, bulk entry and storage changes; lessons 11, 22 and 30.
- “Your table, our machinery”: customization without rebuilding data behavior; lesson 13.
- “Roles, permissions and automatic backups”: authorization and recovery; lessons 20 and 38.
- “GDPR and access reviews”: where operational evidence comes from; lesson 28.
- “Grit plugins: what they are and how to build one”: generated extensions and ownership; lesson 32.
- “Build an invoice app with Grit”: relations, line items and numbering; lesson 31.
- “Build a storefront with Grit”: a larger application, payments and historical updates; lesson 31.
- “Where a Grit app starts scaling”: measure the bottleneck before adding infrastructure; lesson 23.
- “Build a mobile app with Grit”: Expo client generation and image workflows.
- “Build a desktop app with Grit”: Wails, local mirrors and offline POS behavior.

Mobile and desktop are reference extensions here; this course’s implementation stays focused on admin and web. The bibliography file contains each exact article URL and every archived documentation page, organized by feature family.

:::refs https://gritframework.dev/blog, docs/concepts/architecture-modes, docs/mobile/getting-started, docs/desktop/getting-started

# Graduation project and worked answers
Rebuild the Contact baseline in a separate folder, verify the admin, then implement the custom public web CRUD using Book 3. Keep a log of generated files, custom files, database changes and observed test results.

## Explain your architecture
Why use triple? It separates public experience and staff management while sharing one API. Why keep public DTOs? They make disclosure explicit. Why preserve custom files? They provide a stable extension surface. Why inspect an upgrade plan? Modified files may need manual fixes even when generated files upgrade cleanly.

## Explain your operational choices
Why test a restore? A backup file is not proof of recoverability. Why use a queue for durable follow-up? An HTTP request and a detached goroutine do not survive process failure. Why avoid adding every feature immediately? Each feature introduces a policy and failure mode that should solve a real requirement.

## Final exercise
Choose one extension: Company relations, localized contact labels, a staff-only dashboard metric or realtime list refresh. Write the user outcome, exact access policy, affected files, data migration and acceptance test before coding. Keep the base anonymous CRUD behavior working unless changing it is the explicit purpose.

You are ready for the implementation workbook when you can locate the generated code behind every feature instead of treating the CLI as a black box.

:::refs docs/tutorials/contacts/web, docs/tutorials/custom-endpoints, docs/ai-skill
