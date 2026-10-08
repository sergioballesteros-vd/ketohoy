# Account data lifecycle (KH-030)

This is the operational contract for KetoHoy account export and deletion. It describes the current application schema; it is not a statement of legal compliance. Public terms and consent copy are outside this change and remain for KH-046.

## Data inventory

| Entity | User-owned | Exported | Deleted from active DB | Shared/private | Notes |
|---|---|---|---|---|---|
| `User` | Yes | Email, dates, terms/adult consent timestamps and version, booleans for password/Google connection | Yes | Private | Password hash and Google subject are not exported. |
| `Session` | Yes | No | Yes, cascade | Private auth data | Database stores only a hash of the cookie token. |
| `AuthToken` (verify/reset) | Yes | No | Yes, cascade | Private auth data | Database stores only a hash; tokens/secrets never exported. |
| `UserPreferences` | Yes | Yes | Yes, cascade | Private | Includes food preferences and operational timestamps. |
| `PantryItem` | Yes | Yes, with readable product summary | Yes, cascade | Private | Product relation is included by name/category; no full shared catalog. |
| `ShoppingListItem` | Yes | Yes | Yes, cascade | Private | Includes checked/purchase state, source type/contributions and pantry delta; no separate shopping-history table exists. |
| `WeeklyPlan` / `WeeklyMeal` | Yes | Yes, with recipe title, meal type and ingredient summary | Yes, cascading plan/meal relation | Private schedule; recipe catalog shared | Recipe rows are not deleted or exported wholesale. |
| `Product` with `source=manual` and `ownerId` | Yes | Yes | Yes, after account-owned references cascade | Private manual catalog | Recipe ingredient references are detached while their readable ingredient name remains. |
| Legacy manual `Product` with null owner | No known owner | No | No | Legacy/unowned | Never auto-claimed or removed by account deletion. |
| Mercadona/seed/shared `Product` | No | Only a minimal name/brand/category/source/nutrition summary when referenced by the user's pantry/list | No | Shared catalog | Product rows and provider identifiers remain. |
| `Recipe` / `RecipeIngredient` | No | Only a compact recipe summary when a user's plan refers to it | No | Shared catalog | A private product reference is nulled on deletion; ingredient name/quantity remain. |
| Explore favorites | Device-local `localStorage` | Yes, current browser's product summaries | Not in DB; cache is cleared on UI logout/deletion | Shared or current user's private product | Stored as product IDs under `ketohoy:favoriteProductIds`; not account-synced. |
| Deletion ledger | Minimal operational record | No | No automatic expiry | Restricted operational metadata | Stores only `userId` and `deletedAt`, outside SQLite backups. |

User-owned records are selected by the authenticated session's `userId`; no client-supplied user ID is accepted. Nullable legacy rows with no owner are not included in an export or deleted with a user.

## Export

`POST /api/account/export` requires a valid session and returns one pretty-printed JSON attachment, `ketohoy-data-export.json`, with `exportVersion: 1` and `generatedAt`. The Preferences action includes current-device favorite IDs in the request. Arrays use stable database ordering. `generatedAt` naturally changes between requests.

Included categories are account metadata and consent timestamps, preferences, pantry rows with readable product details, shopping rows and purchase/source metadata, weekly plans with meal and compact recipe/ingredient summaries, the account's private manual products, and the current browser's local favorites. Favorites are sent as product IDs by the authenticated Preferences action; the server returns only shared/unowned catalog products or products owned by that account. Shared catalog rows are represented only when needed to explain the user's own rows; the global catalog is never dumped. Favorites on another device are not available because they are not synchronized to the account.

Excluded fields include password hashes, Google subject, session rows/cookie secrets, verification/reset tokens, OAuth secrets, and internal database IDs except opaque origin references retained inside `sourceContributions` for provenance. Export is authenticated and marked `private, no-store`; the filename contains no account data. Two accounts are isolated by the server-derived session user.

## Delete and identity check

`POST /api/account/delete` is the only deletion method. It requires the current valid session, the account email typed again (case-insensitive comparison), and the current password when the account has one. Google-only accounts do not need a password; they confirm by typing the email and submitting the explicit delete form. Google reauthentication is not currently available because OAuth credentials/tokens are not retained for a new consent challenge; this typed confirmation is the current extra deliberate step, not proof of a fresh Google login.

The endpoint first appends and fsyncs `{ userId, deletedAt }` to the configured external ledger. It then uses one Prisma transaction to detach private product references from shared recipe ingredients while preserving their names, delete the user (cascading sessions, tokens, preferences, pantry, shopping rows, plans and meals), and delete the account's private manual products. Any FK conflict rolls the transaction back; shared and other-account catalog/content are not deleted. On success the session cookie is cleared. A retry after success is unauthorized; a failed transaction leaves the database transaction rolled back and the durable ledger entry remains for safe retry/recovery.

The browser flow is in Preferences: export is a download action; deletion is behind a keyboard-operable disclosure and requires typing the account email plus the password for password accounts. It does not require exporting first. On success it clears the current device's favorites cache and navigates to the public login page. Logout in Preferences also clears this device-local cache.

The endpoint returns 401 for no valid session, 400 for invalid confirmation, 503 when the external ledger is not configured/writable, and a generic 500 for database failure. Error responses do not include SQL, filesystem paths, tokens, hashes or account identifiers. POST follows the app's existing `SameSite=Lax` cookie CSRF contract. No new rate limiter was added.

## Retention and limits

### Active database

On successful deletion the active SQLite database no longer contains the account, its sessions/tokens or its user-owned content. Private manual products are deleted in the same transaction. Shared catalog rows and unrelated accounts remain.

### Backups

The periodic local backup job is every six hours and retains up to fourteen days of dated copies, pruning only after a new verified copy succeeds and always keeping at least the newest copy. Deploy-time pre-migration backups separately retain the ten most recent copies; their age depends on deploy cadence. Off-host backup storage is not configured. Therefore there is no honest maximum age for every historical copy today, and deletion does not instantly erase data from backups.

The deletion ledger is outside the database and backup directory, and must be preserved separately from every database backup. Each restore replays it before the restored database can be published. Keep records until every backup capable of containing the account has expired; no fixed ledger expiry is set while backup destinations/maximum age and legal review are unresolved. If the authoritative ledger is missing or invalid, do not activate the restored DB.

### Logs and external processors

The application does not define a log retention duration in this repository. Operational logs must not contain passwords, cookies/tokens, export payloads, shopping/pantry content or raw account deletion requests. Retention settings for host/system logs have not been verified. Resend is used for verification/recovery email and Google is an authentication provider; provider-side retention/processor terms and account-deletion effects were not verified here. These limits and retention periods require legal/operational review; no statutory period is asserted.

Expired sessions and verification/reset tokens are purged together with creation of the next session, in the same database transaction. A user who never starts another session can leave expired rows until a later login/session issuance; there is no scheduled purge job or fixed maximum age yet.

## Deletion ledger configuration

The deployment script creates the private directory/empty file and sets `ACCOUNT_DELETION_LEDGER` in `shared/.env.local`. For an existing host before its next deploy, provision the same path with the service account and set that variable in the service environment:

```sh
sudo install -d -o ubuntu -g ubuntu -m 0700 /home/ubuntu/ketohoy/shared/privacy
# Set in the service environment / shared/.env.local:
ACCOUNT_DELETION_LEDGER=/home/ubuntu/ketohoy/shared/privacy/account-deletions.jsonl
```

The file is append-only JSON Lines with only opaque account IDs and deletion timestamps; it is created mode `0600` in a private directory. If unset or unwritable, account deletion fails closed before changing the active database. The ledger is not part of the periodic backup folder. For recovery from total host loss or an off-host database copy, obtain the authoritative ledger from its separately protected copy before running restore; that copy has not yet been configured as part of KH-036.

## Restore after deletion

`scripts/backup-db.py restore BACKUP DESTINATION` requires `ACCOUNT_DELETION_LEDGER`. It restores into a new temporary file, validates each ledger record, and in one SQLite transaction replays every distinct account tombstone: nulls private product references in shared recipe ingredients, deletes the user and cascaded rows, and deletes owned manual products. It then checks SQLite integrity and foreign keys before publishing the destination. The active database is never overwritten. Missing/malformed ledger data or failed reconciliation aborts restore and leaves no destination to activate.

Restore drill (automated in `bash scripts/backup-db.test.sh`): create users A/B, private/shared products and dependent content; take an old backup; add A's deletion record; restore the old backup to a new path; verify A and all A-owned rows are absent, B/shared catalog and shared recipe content remain, and integrity/FKs pass. Reconciliation is idempotent, so repeat it after another restore if necessary.

Operational order before serving traffic: stop writes; restore to a new path with the authoritative ledger; verify integrity/FKs and that every ledger ID is absent; verify unrelated/shared rows and app health; only then point the service at the restored database and reopen writes. A restore without ledger reconciliation must never be activated.

## Review still required

Legal review is needed for public privacy/retention copy, retention duration, processor terms, and the long-term retention period of the minimal deletion ledger. Operational verification is still needed to configure/preserve the ledger on the actual host and verify independent backup/ledger recovery. Those items do not change the technical behavior documented above; KH-046 remains unimplemented.
