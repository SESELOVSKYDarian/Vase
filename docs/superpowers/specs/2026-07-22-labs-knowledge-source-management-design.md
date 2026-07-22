# Labs knowledge source management

## Goal

Allow a tenant owner to rename or delete an existing Labs knowledge source and
then add it again through the current Add knowledge flow. Deleting the final
external-management source must also clear its imported Labs catalog so a later
connection starts with a clean Business snapshot.

## User interface

Each knowledge-source row will retain its current icon, title, update time, and
status. An actions area will add Edit and Delete controls without making the
whole row destructive.

Edit opens a compact modal containing the current title. Saving updates only
the source title and refreshes the server-rendered list.

Delete opens a dedicated confirmation modal. It names the selected source and
states that the action cannot be undone. For an `EXTERNAL_MANAGEMENT` source,
the modal additionally explains that imported Labs catalog products will be
removed. The destructive button remains visually distinct from Cancel.

## API and authorization

A tenant-scoped item route will support:

- `PATCH /api/labs/knowledge/:knowledgeId` with a validated non-empty title.
- `DELETE /api/labs/knowledge/:knowledgeId`.

Both operations resolve the Labs session context first and only access records
whose `assistantId` matches the resolved assistant. A caller cannot select a
tenant or assistant through the request body.

Unknown or cross-tenant item IDs return a not-found response without revealing
whether the ID exists elsewhere.

## External-management deletion

Deletion runs transactionally. After deleting the selected item, Labs checks
whether the same assistant still has another `EXTERNAL_MANAGEMENT` source. If
none remains, it deletes that global tenant's `CatalogProduct` rows and
`CatalogSyncEvent` rows. Other tenants and unrelated knowledge sources are not
modified.

The existing Add knowledge flow remains the entry point for reconnecting. A
new external-management source performs the existing authenticated initial
snapshot import before becoming ready.

## Duplicate prevention

Creating an `EXTERNAL_MANAGEMENT` source while one already exists for the
resolved assistant returns a conflict. This avoids ambiguous ownership of the
shared tenant catalog. After deletion, creation is permitted again.

## Error handling

- Invalid titles return `400`.
- Missing sessions return `401` and tenant authorization failures return `403`.
- Missing or cross-tenant sources return `404`.
- Duplicate external-management sources return `409`.
- Persistence failures are sanitized and do not expose database details.
- A failed transactional delete leaves both the source and catalog intact.

## Testing

Tests will cover tenant-scoped rename and delete, cross-tenant rejection,
transactional external catalog cleanup, preservation when another external
source remains, duplicate prevention, modal confirmation behavior, successful
refresh, and the existing add/source synchronization behavior.
