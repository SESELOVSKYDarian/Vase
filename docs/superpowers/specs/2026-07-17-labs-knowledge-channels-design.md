# Labs Knowledge and Channels UX Design

## Goal

Replace the technical, always-visible Labs knowledge and channels dashboards with task-focused empty states and guided creation flows. Configuration details appear only when the owner chooses to add a knowledge source or channel.

## Knowledge page

### Empty state

When the assistant has no knowledge sources, the page shows only:

- the page heading and description;
- a clear empty-state message;
- an `Agregar conocimiento` action.

No source shortcuts, placeholder groups, credentials, or technical integration details remain visible in the empty page.

### Add-knowledge modal

The action opens a two-step modal.

1. The owner chooses one of five source types.
2. The modal renders the type-specific setup.

The supported types and behaviors are:

1. **Documento o archivo:** accepts only PDF, Word (`.doc`, `.docx`), Excel (`.xls`, `.xlsx`), PowerPoint (`.ppt`, `.pptx`), and plain text (`.txt`). Client and server enforce the same allowlist.
2. **URL:** accepts a valid web URL.
3. **FAQ manual:** accepts a question and an answer.
4. **Vase Management:** selecting this type connects the authenticated Labs tenant automatically. It never asks for credentials.
5. **Sistema de gestion externo:** shows read-only values owned by Vase Business: `business.vase.ar`, the tenant UUID, and the Consumer Key. Opening this step asks Vase Business for the authenticated tenant's credentials. Business returns the existing Consumer Key or creates and persists one atomically when none exists. Reopening the modal returns the same key rather than generating duplicates. Each value has an independent copy action. Labs does not accept, generate, or persist a tenant Consumer Key.

Validation and request errors are shown inside the modal. User-entered values remain available after a recoverable error.

### Populated knowledge base

Persisted sources use normalized source types. The page groups existing items by their source type and renders only non-empty groups. Each item retains its training or readiness status and update time.

The five groups correspond to the five source types in the modal. The systems-of-record connections remain distinguishable as Vase Management and external management systems rather than being collapsed into an ambiguous generic integration.

## Channels page

### Empty state

When no channel exists, the page shows only:

- the page heading and description;
- a clear empty-state message;
- an `Agregar canal` action.

Plan metrics, channel cards, webhook summaries, endpoint lists, and disconnected placeholder cards are hidden.

### Add-channel modal

The action opens a two-step modal.

1. The owner chooses WhatsApp, Instagram, or Facebook. Entitlement limits still disable unavailable choices.
2. The modal shows the selected channel's Webhook URL and Webhook Key, each with a copy action.

The second step contains `Comprobar conexion`. The existing `Continuar con Meta` OAuth redirect is removed from this flow. The owner configures the displayed webhook values in Meta and then returns to verify the connection manually.

Webhook keys are created or retrieved on the server. The client must not derive, guess, or embed them. Verification returns one of three UI outcomes without closing the modal prematurely:

- connected successfully;
- still pending configuration;
- verification error with a retryable explanation.

A verified connection is then shown on the main page. Once channels exist, the page may show operational cards and connection status for those actual records only; it must not render placeholder cards for unconfigured channel types.

## Data and security boundaries

- Every read and mutation resolves the authenticated Labs request context and scopes data to its assistant and global tenant.
- Vase Business is the sole source of truth for external-management Consumer Keys. Labs obtains the values dynamically through an authenticated server-to-server boundary whenever the credential step opens.
- Consumer Key creation in Business is idempotent and safe under concurrent requests: one active key is returned for the tenant whether it existed before the request or was created by it.
- The external-management credential response exposes only the domain, tenant UUID, and Consumer Key requested by the product design.
- No Consumer Secret, raw internal service token, database credential, or unrelated manifest data is returned to the browser.
- Copy buttons operate only on values already authorized for the current tenant.
- File type validation is duplicated at the browser boundary for feedback and at the server boundary for enforcement.
- Webhook verification uses stored server-side channel state and secrets.

## Component boundaries

- `KnowledgeAddModal`: controls the two-step knowledge flow and delegates each type to a focused form or credential panel.
- Knowledge source forms: validate and submit file, URL, FAQ, Vase Management, or external-management requests.
- `KnowledgeGroups`: groups normalized records and renders only populated groups.
- `ChannelConnectModal`: controls channel selection, webhook credential display, copy feedback, and verification.
- Server routes/services: own tenant resolution, normalized persistence, integration credentials, webhook credential access, and connection verification.

These components should reuse the existing Labs visual language, modal primitives, button styles, status pills, entitlement calculations, and server context resolution.

## Accessibility and interaction

- Both modals expose dialog semantics, labelled headings, keyboard-reachable controls, Escape/close behavior, and visible focus states.
- Copy actions announce success without changing the underlying value.
- Loading actions disable duplicate submissions and use explicit progress labels.
- Back navigation preserves the selected type where useful; closing a modal resets transient state.

## Error handling

- Invalid inputs receive field-level messages.
- Server or integration failures receive a modal-level retry message without discarding valid input.
- If automatic creation or retrieval fails, the modal displays a retryable unavailable state. Labs never invents a fallback key and never requires an owner to configure tenant credentials manually.
- Channel verification distinguishes pending setup from a system error.
- Tenant authorization failures never leak the existence or credentials of another tenant.

## Testing

Automated coverage must verify:

- the clean knowledge and channel empty states;
- the five knowledge choices and their second-step behavior;
- accepted and rejected file extensions on client-independent server logic;
- URL and FAQ validation;
- automatic Vase Management connection for the current tenant;
- the external credential response allowlist and tenant isolation;
- automatic, idempotent Consumer Key creation in Vase Business and reuse on later or concurrent requests;
- normalized grouping and omission of empty groups;
- webhook URL and key retrieval for the selected channel;
- removal of the OAuth redirect behavior from the modal;
- connected, pending, and error verification states;
- entitlement-disabled channel choices;
- rendering only real channel records on the populated page.

Implementation follows red-green-refactor: behavior tests are introduced and observed failing before production changes, then the smallest implementation is added and the relevant Labs test suite, typecheck, and production build are run.

## Out of scope

- Adding knowledge formats beyond the approved allowlist.
- Accepting or storing credentials belonging to an external management system.
- Displaying a Consumer Secret.
- Redesigning unrelated Labs navigation, inbox, activity, or settings pages.
- Reintroducing Meta OAuth inside the new manual channel flow.
