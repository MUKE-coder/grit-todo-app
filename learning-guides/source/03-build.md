# The application you will build
This workbook rebuilds the contact application already present in the workspace. Visitors can create, browse, search, edit and delete contacts without signing in. Staff use the protected admin panel. The public website includes loading skeletons, error/retry states, detail pages, confirmation dialogs and image fallbacks.

The required record fields are a name, optional unique email, optional phone and optional profile reference. The public form preserves photos uploaded through admin; it does not implement a new anonymous upload endpoint. That keeps the implementation faithful to the existing app.

## What comes with the book
The companion contains complete selected files at their original relative paths, a file inventory with hashes, and instructions for applying them to a generated baseline. The PDF includes the central custom implementation in its code atlas. Large generated services and tests are available as complete companion files so you can inspect them without retyping.

Use a separate practice project. Do not run scaffold, migration or replacement commands over your working app merely to follow the book. The exact baseline is Grit 3.397.0; the research snapshot identifies 3.398.0. A newer scaffold may need small integration adjustments.

## Finish line
You should be able to explain every changed boundary, reproduce the UI and prove the accepted/rejected requests. A page that looks correct without working create/edit/delete and failure states is not the finished exercise.

:::refs docs/tutorials/contacts/web, docs/backend/public-api

# Stage 1: create a separate baseline
Install the prerequisites described in Book 2. Create a practice parent directory somewhere distinct from the existing workspace. Run the scaffold inside that parent so the generated folder is also named `todo-app`; this preserves the companion’s Go import prefix.

```powershell
# Start in your chosen empty practice parent.
grit version
grit new todo-app --triple --next --db sqlite
Set-Location todo-app
pnpm install
```

Check `grit.json`, `apps/api/go.mod` and the frontend package manifests. The inspected source requires Go 1.26.9 and declares Next.js 16.3.8. Use the scaffold’s actual dependencies and lockfile; do not downgrade them to match an old blog’s minimum versions.

## Expected result
You have `apps/api`, `apps/admin`, `apps/web` and `packages/shared`. No Contact-specific custom file has been copied yet. Run `grit migrate`, `grit seed` and `grit start`, then verify the untouched admin and web pages.

## If it fails
Resolve missing commands, occupied ports and database setup before proceeding. Read startup output for actual service URLs. A baseline that cannot authenticate an administrator is not ready for debugging a custom public form.

:::refs docs/getting-started/installation, docs/getting-started/create-a-project, docs/getting-started/quick-start

# Stage 2: generate the Contact resource
Run the resource generator from the practice project root. This creates the shared resource stack and public reads.

```powershell
grit generate resource Contact --fields "name:string,email:email:unique,phone:tel:UG,profile:file:image" --public
grit migrate
grit seed
```

Inspect the generated admin Contact page. Create a fictional record with a valid name and email, edit it, and confirm it appears in the API/database. Keep that baseline record for read tests; use separate disposable records for deletion tests.

## Review these generated files
- `apps/api/internal/models/contact.go`: model and hooks.
- `apps/api/internal/services/contact.go`: persistence operations.
- `apps/api/internal/handlers/contact.go`: protected handlers and request types.
- `apps/api/internal/handlers/contact_public.go`: public read DTO and handlers.
- `apps/api/internal/routes/contact_routes.go`: resource routes.
- `packages/shared/schemas/contact.ts` and `types/contact.ts`: frontend contracts.
- `apps/admin/resources/contacts/`: generated config and owned overrides.

## Expected result
Protected admin CRUD works before you add public writes. The generator’s `--public` option provides list/detail access, not the public mutations implemented later in this book. If your generated structure differs, compare version and current docs before copying files.

:::refs docs/concepts/generated-files, docs/concepts/field-types, docs/backend/public-api

# Stage 3: understand the edit map
Apply changes in dependency order: server model/service and routes; shared schema; web helper; reusable UI components; directory/detail routes; tests. The companion mirrors the repository paths so you can compare files directly.

## Replace or create the custom surface
Use the companion versions of `contact_public.go`, `contacts-public.ts`, `ContactForm.tsx`, the four files under `components/contacts`, and the two contact route pages. The code atlas reproduces those core files. Review existing local changes before replacement.

## Merge small changes into generated files
The service needs the absent-email insertion change. CORS needs `If-Match` in allowed headers. The resource routes need three public mutation mounts. The shared schema needs blank optional-field transforms. These edits are explained individually below; preserve unrelated code and generator markers.

## Keep generated infrastructure
The companion is not an entire monorepo. It depends on the generated UI components, provider, internal Go packages and shared exports. Do not copy a single handler into an empty Go project and expect it to compile.

## Checkpoint
Create a version-control or filesystem checkpoint of the practice baseline. Record which files you fully replace and which you merge. The original source snapshot is preserved in the companion with SHA-256 hashes so you can tell whether your copy diverged.

:::refs docs/concepts/code-generation, docs/upgrades

# Stage 4: model and optional-email policy
Open `apps/api/internal/models/contact.go`. The existing email field is a string with a unique index. The inspected database column is nullable and has no empty-string default. Preserve that condition if you expect absent email to become NULL when omitted from an insert.

```go
Email string `gorm:"size:254;uniqueIndex" json:"email"`
```

The real model includes additional format/documentation/search tags; retain them from the generated or companion file. The line above highlights the persistence rule only. Do not replace the complete field declaration just to shorten it.

## Edit the Create method
In `apps/api/internal/services/contact.go`, after obtaining the write handle and before Create, add the omission branch shown below. Keep the existing return/reload and file-reference handling.

```go
db := s.db(ctx)
write := s.write(db)
if item.Email == "" {
    write = write.Omit("email")
}
if err := write.Create(item).Error; err != nil {
    return err
}
```

## Verify
Create two contacts with names but no email. Both should succeed. Create two with the same non-empty email; the second should conflict. Do not delete a legacy empty row to make the test pass. If the column is NOT NULL or defaults to an empty string in your database, plan the schema/data migration first.

:::refs https://gorm.io/docs/create.html, docs/backend/models

# Stage 5: define the public contract
Open `apps/api/internal/handlers/contact_public.go`. The public response shape contains ID, name, email, phone, profile and version. Its mapper copies only those fields from the model.

```go
type publicContact struct {
    ID      string         `json:"id"`
    Name    string         `json:"name"`
    Email   string         `json:"email"`
    Phone   string         `json:"phone"`
    Profile *files.FileRef `json:"profile"`
    Version int            `json:"version"`
}
```

Keep the existing list and detail reads. The list initializes an empty slice so it serializes as `[]`. It searches name/email/phone and allowlists sort fields. Both reads set `Cache-Control: no-store`. Keep the service’s public visibility/deletion scope.

## Snapshot limitation
The existing PublicCreate success response returns the model, while reads and PublicUpdate use `toPublicContact`. The current model has no internal note field, but creation therefore returns extra model metadata. The code atlas preserves the actual snapshot; a recommended follow-up is to return `toPublicContact(item)` on creation too and assert its response shape in a test. Do not claim the current create response is already allowlisted.

## Checkpoint
Compare one public GET response with the shared `PublicContact` interface. Add fields intentionally on both sides rather than using the database model as the browser contract.

:::refs docs/backend/public-api, docs/backend/response-format

# Stage 6: implement public creation
Add `PublicCreate` to the public handler file using the complete code in the atlas. It binds `CreateContactRequest`, trims the name, rejects a blank result, constructs a model and calls the existing service.

```go
req.Name = strings.TrimSpace(req.Name)
if req.Name == "" {
    respond.Validation(c, "Name is required",
        map[string]string{"name": "Name is required"})
    return
}
item := models.Contact{
    Name: req.Name, Email: req.Email,
    Phone: req.Phone, Profile: req.Profile,
}
if err := h.service().Create(h.ctx(c), &item); err != nil {
    h.fail(c, err, "Failed to create contact")
    return
}
```

The complete function also performs JSON binding and returns 201. Reuse the generated handler’s `service`, `ctx` and `fail` helpers. This preserves configured dependencies and project error translation.

## Verify before building the form
Submit `{}`, a whitespace-only name and a valid name directly to the API in the practice environment. Invalid input should not create a row. The successful response should contain the submitted name and a generated ID.

## Why this step matters
The original browser payload was correct while the running API behaved differently from source. Direct request tests help isolate the server and make a stale binary visible before frontend styling distracts from the problem.

:::refs docs/backend/handlers, docs/backend/errors

# Stage 7: implement replacement updates
Add `PublicUpdate` from the atlas. It binds the same editable fields, validates the name, checks that the contact is publicly available and sends an explicit update map to the service.

```go
var email interface{} = strings.TrimSpace(req.Email)
if email == "" {
    email = nil
}
item, err := h.service().Update(h.ctx(c), c.Param("key"),
    map[string]interface{}{
        "name": req.Name, "email": email,
        "phone": req.Phone, "profile": req.Profile,
    }, concurrency.FromRequest(c))
```

The full handler checks `err` and returns the public mapper. The explicit map permits clearing zero-valued fields. A struct update can skip them depending on the ORM method. The version precondition comes from the request header through the existing concurrency helper.

## Verify
Create a disposable contact with email and phone. Change the name, then clear email and phone. Reload and confirm the fields are actually cleared. Send an old version and confirm the service reports a conflict. The integration test in the companion includes this sequence.

## Semantics
This is PUT over all editable fields, not a general-purpose partial PATCH. Preserve the profile reference in the form. A client that omits it may clear it, so explain replacement behavior to anyone consuming this API.

:::refs docs/backend/services, docs/backend/handlers

# Stage 8: implement public deletion
Add `PublicDelete` from the atlas. First resolve the ID through the public scope, then call the service’s Delete operation. Return a message-only success response.

```go
if _, err := h.service().GetPublic(
    c.Request.Context(), c.Param("key")); err != nil {
    h.fail(c, err, "Failed to load contact")
    return
}
if _, err := h.service().Delete(h.ctx(c), c.Param("key")); err != nil {
    h.fail(c, err, "Failed to delete contact")
    return
}
c.JSON(http.StatusOK, gin.H{"message": "Contact deleted successfully"})
```

The delete uses the existing soft-delete behavior. It does not permanently erase the physical row, and it does not necessarily free a unique email for reuse. The current public delete helper does not send a version token; do not describe it as version-checked.

## Verify
Delete only a contact created for this exercise. Its detail should become 404 and the list should omit it. Repeating update/delete should produce missing-record behavior. Check that cancelling the eventual browser confirmation sends no DELETE request.

## Access reminder
Anonymous public deletion is the chosen product policy. Staff routes remain protected, but public clients can use this endpoint without a user session when they supply the configured public key.

:::refs https://gorm.io/docs/delete.html, docs/backend/public-api

# Stage 9: mount routes and allow headers
Open `apps/api/internal/routes/contact_routes.go`. Keep the existing handler construction and staff routes. Add the three public writes next to the generated public reads.

```go
m.Public.GET("/contacts", h.ListPublic)
m.Public.GET("/contacts/:key", h.GetPublic)
m.Public.POST("/contacts", h.PublicCreate)
m.Public.PUT("/contacts/:key", h.PublicUpdate)
m.Public.DELETE("/contacts/:key", h.PublicDelete)
```

Open `apps/api/internal/middleware/cors.go`. Append `If-Match` to the existing Access-Control-Allow-Headers value. Preserve the other allowed headers and dynamic origin logic. Confirm `X-API-Key` and the required methods are already allowed.

## Restart correctly
Format changed Go files and rebuild/restart the API from its expected working directory. Use the generated development command when possible. If manually launching it, start under `apps/api` so local storage paths resolve consistently.

## Verify
Inspect `grit routes` and the browser’s OPTIONS request. A direct PowerShell request may work even while browser CORS fails. That difference points to origin/header policy, not necessarily a broken update handler.

## Checkpoint
The public route group must remain outside user authentication while retaining its API-key middleware. Do not move staff routes into the public group to make one form work.

:::refs docs/backend/middleware, docs/cli

# Stage 10: prove the API independently
Use the project’s own public key without publishing it. The following PowerShell sequence assumes you set `$publicKey` locally and use the actual API URL. Run it only against your disposable practice database.

```powershell
$apiBase = 'http://localhost:8080/api/v1/public/contacts'
$headers = @{ 'X-API-Key' = $publicKey }
$payload = @{ name = 'Workbook Example'; email = 'workbook@example.test' }
$created = Invoke-RestMethod -Uri $apiBase -Method Post -Headers $headers -ContentType 'application/json' -Body ($payload | ConvertTo-Json)
$contactId = $created.data.id
Invoke-RestMethod -Uri "$apiBase/$contactId" -Headers $headers
$payload.name = 'Workbook Updated'
Invoke-RestMethod -Uri "$apiBase/$contactId" -Method Put -Headers $headers -ContentType 'application/json' -Body ($payload | ConvertTo-Json)
Invoke-RestMethod -Uri "$apiBase/$contactId" -Method Delete -Headers $headers
```

The long lines wrap visually in the PDF. Use the companion request script for copy/paste. Do not type the printed continuation indentation as new PowerShell statements.

## Expected result
Create returns the submitted values and an ID; detail returns that record; update returns the new name; delete returns its success message. A later detail request returns 404. Separately test invalid JSON/input and duplicate email through the integration suite.

## Important limit
This request sequence checks the live process and route configuration. The handler integration tests mount routes directly and do not prove the full API-key/CORS middleware stack by themselves.

:::refs docs/backend/public-api, docs/testing

# Stage 11: align the shared schema
Merge the companion’s `packages/shared/schemas/contact.ts` into your practice project. Keep the existing shared exports so importing from `@repo/shared/schemas` resolves correctly.

```ts
email: z.string()
  .transform(value => value === "" ? undefined : value)
  .pipe(EmailSchema.optional())
  .optional(),
phone: z.string()
  .transform(value => value === "" ? undefined : value)
  .pipe(PhoneSchema.optional())
  .optional(),
profile: FileRefSchema.nullable().optional().default(null),
```

The complete schema also declares the required name and the update shape. The form and server trim the name because a plain minimum length check alone accepts whitespace. Do not assume `grit sync` makes the Go server execute this schema; it regenerates frontend contracts.

## Verify
An empty email/phone should not produce a browser validation error. An invalid non-empty email should. Inspect the outgoing JSON: undefined object properties are omitted, while null remains explicit. The server’s service rule still determines NULL persistence.

## Checkpoint
Keep `profile` when editing even though there is no public upload control. The server expects the editable replacement state; dropping the profile accidentally can remove the existing photo reference.

:::refs docs/frontend/shared-package, docs/concepts/type-system

# Stage 12: install the public API helper
Create or replace `apps/web/lib/contacts-public.ts` with the companion version. The complete file appears in the atlas. It defines `PublicContact`, paginated results, public list/detail reads, the create/update helper and a separate delete helper.

## Read the contracts
- List accepts query parameters and throws on failure.
- Detail returns null for 404 and throws for other failures.
- Create/update returns status, optional body and message for the form.
- Delete resolves on success and throws on error; it does not expect data.

The API origin trims trailing slashes. Query strings use URLSearchParams and detail IDs are encoded. Reads request no-store. The public key comes from `NEXT_PUBLIC_API_KEY`, which is intentionally browser-visible.

## Known snapshot choices
The create/update helper’s generic failure wording mentions creation even for an update, and its caught network failure uses status 500 as an application result. These are implementation choices in the existing snapshot, not ideal distinctions between an actual server 500 and no HTTP response. Improve them as an exercise after reproducing the baseline.

## Verify
Call list and detail from the web environment before rendering a full directory. Confirm the actual request origin and key. A missing API key is a configuration error, not evidence that there are no contacts.

:::refs docs/frontend/web-app, docs/backend/public-api

# Stage 13: reuse the generated provider
Open `apps/web/components/providers.tsx` and the app layout that uses it. Confirm the contact routes are descendants of the generated QueryClientProvider. Do not create a separate provider for each card or modal.

## Query keys used by this implementation
```ts
["public-contacts", query, sort, page]
["public-contact", id]
```

The list prefix invalidates all its cached search/sort/page variants. The detail prefix invalidates detail data after edits. On detail deletion, remove that exact detail query and navigate back to `/contacts`.

The directory keeps immediate search text separate from the debounced query. Its 250 ms timer updates the query and resets page one. A separate effect corrects the page if deleting records makes the current page exceed the response’s page count.

## Verify
Create a contact while the list is visible and confirm a refetch follows. Edit it from its detail page, then return to the list and confirm the name is current. If only one surface updates, inspect which query key was invalidated.

## Exercise and answer
Why not call router.refresh for every mutation? The contact data is owned by TanStack Query in client components. Refreshing a Next.js server payload does not replace explicit invalidation of that cache.

:::refs https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation

# Stage 14: build the avatar first
Create `apps/web/components/contacts/contact-avatar.tsx` from the atlas. It resolves a FileRef URL against the public API origin, rejects unexpected URL schemes and uses initials when there is no working image.

The component tracks the failed URL rather than a permanent “failed” boolean. If the contact receives a different image URL later, the new source can load. Initials use the first two whitespace-separated name parts, with a question-mark fallback for blank legacy names.

## Design choices
Stable dimensions prevent layout shift. `object-cover` crops a photo into the avatar shape. A deterministic color selection keeps a person’s fallback visually stable. The large variant supports the detail page without duplicating URL/fallback logic.

## Verify
Render a contact with no profile, a valid absolute URL, a valid relative URL and a broken URL. All should occupy the same intended space. Confirm alt/initial labels describe the contact without adding duplicate interactive controls.

## Image debugging
If the direct image URL returns 404, inspect the API storage path and working directory before changing the component. In the original app, starting the API from `apps/api` resolved the local-storage mismatch. The fix was not a Next Image optimizer configuration change.

:::refs docs/batteries/storage, https://nextjs.org/docs/app/getting-started/images

# Stage 15: create one reusable form
Create or replace `apps/web/components/forms/ContactForm.tsx` with the companion file. The same component handles creation when `contact` is absent and editing when it is present. It uses the generated Dialog, Button, Input and Label primitives.

## Follow the submit path
1. React Hook Form validates with the shared schema.
2. Trim and reject a blank name.
3. Choose POST or PUT and pass the edit version if available.
4. If there is no successful body, display the error and return.
5. Only on success, reset, close and invoke `onSaved`.

The form defaults include profile. Opening the dialog resets values from the current contact and clears old submission errors. Pending state disables submission/cancel and prevents accidental dialog dismissal during the request.

## Verify
Submit a duplicate email. The modal must remain open and preserve the name/phone. Correct the email and submit again. Then edit a contact with a photo and verify the profile survives a phone-only change.

## Design checkpoint
Input labels use unique IDs from `useId`. Errors have invalid state and the submission error has an alert role. The generated dialog handles focus behavior; test keyboard opening, tabbing and closing as well as mouse clicks.

:::refs docs/admin/forms, https://react-hook-form.com/docs/useform

# Stage 16: add a delete confirmation
Create `apps/web/components/contacts/delete-contact.tsx` from the atlas. The component receives the target contact and an `onDeleted` callback. It owns confirmation visibility, pending state and any request error.

## Why keep the callback separate?
Deletion from a directory should refresh the list. Deletion from a detail page should refresh the list, remove detail cache and navigate away. The shared confirmation component need not know which page contains it.

On failure, keep the confirmation visible with an actionable error. In `finally`, reset only the pending flag. Closing unconditionally would hide the failure. Name the contact in the confirmation so users can catch a mistaken target.

## Verify
Cancel and inspect the Network panel: there should be no DELETE request. Confirm a disposable contact: exactly one pending action should be visible. Stop the API and attempt another disposable deletion; the error should remain visible without falsely showing success.

## Semantics checkpoint
The wording says the action cannot be undone here because the public UI has no restore flow. The underlying service soft-deletes; admin trash/restore behavior is a separate surface. Do not tell learners that this endpoint physically erases all stored traces.

:::refs docs/admin/trash, https://gorm.io/docs/delete.html

# Stage 17: assemble the directory
Create `apps/web/components/contacts/contacts-directory.tsx` from the atlas. It combines the public query, header, search/sort toolbar, responsive content, pagination and mutation callbacks.

```ts
const contacts = useQuery({
  queryKey: ["public-contacts", query, sort, page],
  queryFn: () => getPublicContacts({
    search: query, page, page_size: 10,
    sort_by: sort === "newest" ? "created_at" : "name",
    sort_order: sort === "newest" ? "desc" : "asc",
  }),
});
```

The actual component uses a light neutral canvas, white surfaces, teal primary actions and clear text hierarchy. It has a mobile card arrangement and a desktop table. These are responsive layouts, not a user-selectable grid/table toggle.

## Verify
Search by name, email and phone. Change sorting. Create enough fictional contacts to cross a page boundary. Delete the last item on the last page and confirm pagination returns to a valid page. Verify names link to the detail route.

## Design exercise
Test an unusually long name/email and a legacy blank name. The layout should wrap or provide a fallback without clipping actions. Check the narrow viewport rather than assuming desktop CSS proves mobile behavior.

:::refs docs/frontend/ui-components, docs/admin/datatable

# Stage 18: render pending, empty and error
The directory renders a skeleton during the initial query, an error panel with retry on failure, and a distinct empty state when a successful query contains no rows. Its copy changes for an empty search result versus an empty directory.

## Test the states deliberately
Throttle the browser connection to see pending UI. Stop the API for an error, then restart and retry. Search for a value that cannot match to see empty search. Use a new disposable database for a truly empty directory.

## Expected result
Skeletons reserve space for the intended layout. Errors do not claim the database is empty. A clear-search action resets the result set. Existing data should not disappear unnecessarily during background refresh if the query still has usable data.

## Accessibility extension
The snapshot has loading/status announcements and standard dialog primitives. Review reduced-motion behavior for animated skeletons and error association with individual inputs as a follow-up accessibility pass. These are worthwhile refinements; the companion should not be described as a complete independent accessibility audit.

## Exercise and answer
Why can a correct loading.tsx still leave a blank client directory? Client queries begin within the hydrated component’s lifecycle. Their pending state needs to be rendered where the query result is read.

:::refs https://nextjs.org/docs/app/api-reference/file-conventions/loading

# Stage 19: add the directory route
Create `apps/web/app/(marketing)/contacts/page.tsx`. It remains a small server route wrapper that imports the interactive directory.

```tsx
import type { Metadata } from "next";
import { ContactsDirectory } from "@/components/contacts/contacts-directory";

export const metadata: Metadata = { title: "Contacts | todo-app" };

export default function ContactsPage() {
  return <ContactsDirectory />;
}
```

The parenthesized marketing group does not appear in the URL. Visit `/contacts`. The existing marketing layout supplies the surrounding site shell; the directory does not need to duplicate global navigation.

## Verify
Load the route directly, refresh it and navigate to it from another page. Confirm the provider is present and no server-only secret import has entered the client graph. The helper’s public key is intended to be browser-visible; other credentials are not.

## Checkpoint
If the route fails to import a UI component, inspect the generated baseline and alias configuration. Do not install a second component system to work around a missing copied file. The companion depends on the scaffold’s existing primitives.

:::refs https://nextjs.org/docs/app/getting-started/layouts-and-pages

# Stage 20: add the detail route and component
Create `apps/web/components/contacts/contact-detail.tsx` and `apps/web/app/(marketing)/contacts/[id]/page.tsx` from the companion. The server page awaits params and passes the ID to the interactive detail component.

```tsx
export default async function ContactPage({ params }: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContactDetail id={id} />;
}
```

Keep the imports and metadata from the full file. The detail component queries `['public-contact', id]`, displays pending/error/missing states and renders the large avatar, name, email and phone. Edit invalidates list/detail; delete removes detail cache and returns to the directory.

## Verify
Open a real contact, a random ID and a deleted contact. Stop the API and open a real ID. Missing and failed states must differ. Check email and telephone links only appear as actionable values when data is present.

## Exercise
Explain why the helper returns null only on 404. If every API failure becomes null, a temporary outage would falsely say that the contact no longer exists.

:::refs https://nextjs.org/docs/app/getting-started/layouts-and-pages, docs/frontend/web-app

# Stage 21: retain the protected admin
The custom web changes should not replace the generated staff surface. Review the companion’s admin resource files as a reference, keeping your scaffold’s generated registry and custom override conventions.

## Verify both audiences
Sign in as an authorized staff user and create a fictional contact with a photo. Open the public website without signing in and view that contact. Edit its phone publicly, then reload the admin and confirm the change. The same data is shared across two intentionally different access policies.

## Inspect route protection
The staff route list still applies Contact permissions to view/create/edit/delete and related bulk/import/export operations. Public CRUD mounts remain separate. Do not remove RequireRole to make the website work; the website should call the public helper.

## Expected result
Admin behavior remains familiar while the website has its own design. The public response does not automatically include every future admin field. If you add private notes later, review the create-response asymmetry described in Stage 5 before exposing them on the model.

## Exercise and answer
Why can a staff-only export remain protected while public single-record deletion is allowed? Access is defined per surface/action by the product policy. It is unusual for some applications but is exactly the model chosen for this directory.

:::refs docs/admin/resources, docs/admin/roles, docs/backend/rbac

# Stage 22: verify the actual image path
Use an admin-uploaded fictional image. Inspect its FileRef URL, request it directly and compare the URL in the public avatar. Separate missing storage bytes from browser embedding problems.

## Reproduce the original diagnosis
The actual file lived below `apps/api/storage/app`. The API had been launched from the monorepo root and resolved a different relative storage location. Restarting the API from `apps/api` made the file return 200 and restored image display. The configured MinIO driver had fallen back to local storage when unavailable; no environment rewrite was needed for that fix.

## Verification sequence
1. Confirm the file reference in the API response.
2. Open its URL directly and inspect status/content type.
3. Confirm the active storage driver and API working directory.
4. Inspect cross-origin/mixed-content policy if direct access works.
5. Confirm the avatar fallback when the URL is intentionally broken.

## Expected result
The photo displays in admin and web, survives restart and remains after a public text edit. The web form has no new public image-upload control; teaching one would require additional endpoints and validation beyond this snapshot.

:::refs docs/batteries/storage, docs/batteries/media

# Stage 23: run the focused tests
Copy the selected tests from the companion into the same relative paths of the practice project. The Go test file has the integration build tag and uses the generated testkit. It creates isolated test data rather than deleting real contacts.

```powershell
Set-Location apps/api
go test -tags integration ./internal/handlers -run TestContact -count=1
Set-Location ../web
pnpm exec vitest run __tests__/contact-form.test.tsx __tests__/contact-avatar.test.tsx
```

The API suite checks a legacy blank row, correct submitted values, duplicate email rejection, invalid input, two absent-email contacts, CRUD, old-version conflict, search and missing-after-delete. The frontend tests check the form and avatar behaviors in their test environment.

## Interpret results honestly
These tests passed during the earlier application work. They do not prove every middleware or deployment path because handler tests mount their own router. The browser smoke test complements them. The whole web type check previously failed on unrelated `lib/todos-public.ts:144`, so a clean full build was not established.

## Exercise
Make an intentional regression in the practice copy: remove the absent-email Omit branch or close the form on failure. Confirm an appropriate test fails, then restore the correct implementation. This proves your tests protect behavior rather than merely execute code.

:::refs docs/testing

# Stage 24: explain the 409 incident
The symptom was an empty contact created from the web, followed by conflicts even when the visible email was new. The browser sent the expected JSON. The running API binary was stale relative to the edited source: an empty request returned 409 before rebuild/restart and validation failure afterward.

That evidence does not let us inspect the exact old executable’s binding bug. It does establish that debugging only the source without restarting the live process was misleading. Separately, the optional email policy needed a repair because Go’s zero-value string can become an indexed empty SQL string.

## Repairs that work together
- Validate bound requests and reject a trimmed empty name.
- Omit absent email on create under the nullable/no-default schema.
- Write NULL when an email is deliberately cleared on public update.
- Keep failed form drafts and display the server error.
- Rebuild/restart the API and verify the same requests again.

## Exercise and answer
Why not remove the unique index? It would stop protecting genuinely duplicate non-empty emails. Why not merely delete the empty row? Another bad request could recreate it. Why not make email required in the form? Direct API requests would still exercise the broken server path, and the product permits optional email.

:::refs docs/backend/errors, docs/getting-started/troubleshooting

# Stage 25: final browser acceptance
Use disposable fictional contacts and record the outcome of each step. The prior app work completed a create/edit/detail/delete browser sequence and removed its temporary test contact through soft deletion. Repeat this against your practice build because configuration and generated versions can differ.

1. Open `/contacts` without signing in; verify load and skeleton behavior.
2. Create a name-only contact; repeat with another name-only contact.
3. Create a unique-email contact; reject a duplicate without losing the draft.
4. Search by name/email/phone and change sorting.
5. Open a detail, edit its fields and verify both detail and list refresh.
6. Clear an email and verify it remains cleared after reload.
7. Preserve an admin-uploaded profile photo during a public text edit.
8. Cancel deletion and prove no DELETE request occurs.
9. Confirm deletion; old detail becomes unavailable and pagination stays valid.
10. Stop the API and verify retry/error states, then recover.
11. Check narrow layout, keyboard navigation and long text.
12. Confirm protected admin routes still require authorization.

## Completion evidence
Keep request statuses, relevant test output and a short observation for each behavior. Do not equate “the page rendered” with passing this list. A future refactor can use the same acceptance checklist without depending on today’s exact JSX.

:::refs docs/testing, docs/deployment/checklist

# Stage 26: improvements after reproduction
Reproduce the existing app first, then make improvements deliberately. The following are useful exercises because they address real limitations visible in the snapshot.

## Exercise A: consistent public responses
Return `toPublicContact(item)` from PublicCreate and add a response-contract test. Verify that the frontend still works and that future internal model fields do not leak from creation.

## Exercise B: clearer helper results
Distinguish a network failure from an actual HTTP 500 in the mutation helper. Use update-specific failure wording when method is PUT. Keep the form’s preserve-draft behavior unchanged.

## Exercise C: accessibility polish
Associate field error text with inputs through `aria-describedby`, check reduced-motion skeleton styles and verify focus after successful modal close. Use keyboard and assistive-technology checks appropriate to your environment.

## Exercise D: stronger concurrency
Decide whether every edit must include a version and whether delete should have a precondition. Implement that policy across server and client, then test two-tab races. Do not just make the TypeScript field required and assume the server now enforces it.

## Answer approach
For each exercise, write the expected request/response or user outcome first. Change the smallest relevant boundary and rerun the focused tests plus the affected browser steps. Keep unrelated generator updates separate so failures remain explainable.

:::refs docs/backend/public-api, docs/testing

# Stage 27: package and maintain your work
Preserve the baseline version, lockfile, generated ownership manifest and custom files. The companion’s inventory provides file hashes for this snapshot, but it is not a replacement for version control in your own learning project.

## Release rehearsal
Before deploying, resolve the unrelated type-check failure, run the project’s required build/check commands, configure real public API origins and confirm persistent storage. Use a staging database and test backup/restore with both records and uploads. Keep the API working directory predictable.

## Upgrade rehearsal
Read the changelog and run the documented diff/plan workflow. Modified generated files may be left untouched; merge relevant upstream fixes manually. Preserve the Contact service’s email rule, custom public handlers and CORS header while incorporating newer infrastructure behavior.

## Your independent rebuild
Close the companion and outline the build from memory: scaffold, generate, verify admin, define public contract, add writes, align schemas, add helper, compose UI, mount pages, test and diagnose. Reopen the code only where the outline exposes a gap in understanding.

The following atlas contains complete central files from the actual project. Lines may wrap for print. For exact copy/paste, use the companion files; their original formatting is preserved.

:::refs docs/upgrades, docs/changelog, docs/deployment/checklist
