# WhereDidItGo Codebase Review

**Project:** WhereDidItGo  
**Stack:** Vue 3, TypeScript, Vite, Capacitor, Pinia, Dexie, Chart.js  
**Review scope:** Application structure, persistence, finance stores, backup flow, settings/security, analytics, testing, and build configuration.

## Executive summary

The project has a sensible local-first structure, clear feature-based routing, strict TypeScript settings, useful native-service abstractions, and a successful production build. The main risks are not in the general UI organization; they are in **financial data integrity, backup correctness, and security semantics**.

The most valuable next step is to protect the financial domain with automated tests and a centralized transaction/ledger service. After that, strengthen backup validation and the PIN/biometric implementation, then split the large settings screen into focused components. Performance improvements to analytics should follow measurement rather than precede it.

## Current baseline

The production build currently succeeds with `vue-tsc --noEmit && vite build`. The README describes a local-first Android personal finance tracker with accounts, transactions, budgets, insights, JSON backup/import, and CSV export.

## Highest-priority improvements

| Priority | Area | Finding | Recommended improvement |
|---|---|---|---|
| **P0** | Data integrity | Account balances are stored separately from transactions and updated through multiple operations. A failed or interrupted mutation, imported backup, manual balance edit, or future feature can make balances disagree with the transaction ledger. | Make transactions the source of truth and derive balances from an account opening balance plus transaction effects. If performance requires denormalized balances, add a single transactional ledger service and a “recalculate balances” repair command. |
| **P0** | Security | The PIN is a plain SHA-256 hash of a short four-digit PIN with a static prefix. This is vulnerable to fast offline brute force. The biometric setting is persisted as a boolean, and the unlock flow should be verified against a real platform biometric API rather than treating the flag as authentication. | Use platform secure storage/keychain for the secret, preferably with native biometric verification. At minimum, use a per-install random salt, a slow password KDF such as PBKDF2/Argon2 where available, attempt throttling, and a lockout delay. Do not describe a local “forgot PIN” reset as strong security unless it intentionally wipes encrypted data. See `src/stores/settings.ts:65-175` and `src/components/PinLockModal.vue`. |
| **P0** | Backup correctness | Backup validation sanitizes records but does not fully verify referential integrity. Transactions can reference missing accounts or categories, transfers can have the same source and destination, and duplicate IDs may cause bulk inserts to fail. Debts are stored in the database but are omitted from the main backup build and replacement paths. | Add schema validation plus cross-record checks before replacement or merge. Report skipped rows and validation errors to the user. Use a versioned migration pipeline such as `v1 → v2 → v3` instead of one large sanitizer. Include debts in backup export/import. See `src/services/backup.ts:43-64`, `227-301`. |
| **P1** | Financial correctness | Amount handling is inconsistent in intent: transaction creation rounds amounts to integer minor units, while CSV export divides by 100 regardless of the selected currency. This will be wrong for currencies with zero or three decimal places unless the project explicitly restricts all currencies to two decimal places. | Define one explicit money representation, such as integer minor units plus currency exponent. Centralize parsing, rounding, formatting, CSV export, and validation in a money module. Add tests for USD, TJS, JPY, and currencies with three decimal places. |
| **P1** | Transaction validation | `addTransaction()` and `updateTransaction()` validate only that the amount is greater than zero. They do not reject `NaN`, missing accounts, invalid categories, invalid transfer targets, same-account transfers, or transfers to archived accounts. | Introduce typed command validators at the store/service boundary. Validate all IDs and transaction invariants before opening the Dexie transaction, and return user-safe error codes rather than raw strings. See `src/stores/transactions.ts:70-112`. |
| **P1** | Settings architecture | `SettingsView.vue` handles appearance, security, tab configuration, category CRUD, recurring entries, backup import/export, CSV export, destructive reset, and app metadata. It is a clear maintainability hotspot. | Split it into focused sections or child views such as `AppearanceSettings`, `SecuritySettings`, `DataManagementSettings`, `CategoryManager`, and `NavigationSettings`. Move import/export/reset orchestration into a composable or application service. |
| **P1** | Reactive performance | `stats.ts` repeatedly filters and scans the full transaction array for each chart and summary. `budgetProgress()` performs a transaction scan for every budget, and `recentMonthsTrend()` filters the full list for every month. | Build a shared indexed aggregation layer keyed by month, category, account, and day. Compute one normalized summary per requested range and let each chart consume selectors from it. If the dataset remains small, memoize by transaction revision and range before introducing more complex indexing. See `src/services/stats.ts:83-248`. |
| **P1** | Testing | The repository has a Playwright UX walk script but no visible unit-test setup or finance calculation test suite. The most dangerous code—balance effects, recurring posting, budget carry-forward, backup migration, and privacy/security state—therefore lacks regression protection. | Add Vitest or another unit-test runner. Start with table-driven tests for expense/income/transfer balance effects, credit accounts, edits, deletes, restores, recurring month boundaries, backup round trips, malformed imports, and money formatting. Keep Playwright for a small set of end-to-end smoke tests. |

## Architecture and data improvements

### 1. Establish a ledger service

The transaction store currently creates or updates a transaction and separately applies account-balance effects. This makes it easy for future features to bypass the rules or for a new mutation path to update one side but not the other.

Create a domain-level service with commands such as:

```ts
createTransaction(input)
updateTransaction(id, input)
deleteTransaction(id)
restoreTransaction(transaction)
recalculateAccountBalances(accountId?)
```

That service should own validation, the Dexie transaction, balance effects, and audit metadata. The UI and Pinia stores should call this service rather than directly encoding financial rules.

### 2. Make the money model explicit

The project should document whether amounts represent whole currency units or minor units. Current code rounds transaction amounts and later divides CSV values by `100`, which implies minor units, but this assumption is not represented in the domain model.

A stronger model would include a currency exponent or a shared currency metadata lookup:

```ts
interface Money {
  minor: number
  currency: string
}
```

All arithmetic should operate on integer minor units. Formatting and export should use the currency’s actual exponent rather than always assuming two decimal places.

### 3. Add repair and reconciliation tools

Because balances are important user-facing data, add an internal or user-accessible reconciliation flow. It should calculate the expected balance from the ledger, compare it with the stored balance, and offer to create an adjustment transaction or repair the denormalized value.

This also creates a safer path for future imports, manual corrections, and migration recovery.

### 4. Improve database migrations

Dexie schema versions currently add tables, but application-level migrations for changed record shapes should be explicit. Add named migration functions, a persisted backup compatibility version, and a startup recovery state when a migration fails.

Consider adding indexes that match actual access patterns, such as transaction date/month and account/category combinations, rather than relying primarily on full in-memory filtering.

## Security recommendations

The PIN implementation in `src/stores/settings.ts` hashes a short PIN with SHA-256 and a static prefix. This is appropriate only as a lightweight local privacy lock, not as strong protection for financial data.

There are two reasonable product directions:

1. **Privacy-lock direction:** Clearly describe the PIN as a convenience privacy lock, add retry delays, and avoid presenting it as encryption.
2. **Security direction:** Store keys in native secure storage, use real biometric authentication, encrypt sensitive local data, and make PIN reset either require recovery credentials or wipe protected data.

The persisted biometric flag should not itself grant access. It should only indicate user preference; an unlock must be backed by an actual successful native biometric operation.

## Backup and import recommendations

The backup system is an important feature and deserves a more defensive design.

Before importing, validate the following:

| Check | Expected behavior |
|---|---|
| Backup version | Migrate supported versions; reject unsupported future versions with a clear message. |
| Required collections | Require all mandatory collections and treat optional collections consistently. |
| Duplicate IDs | Reject or deterministically resolve duplicate IDs before database writes. |
| Account references | Ensure every transaction and recurring item references an existing account. |
| Category references | Ensure expense/income categories exist and match transaction type. |
| Transfer references | Require a valid destination different from the source. |
| Currency differences | Warn when the backup currency differs from the current app currency. |
| Record counts | Show a dry-run preview before replacement. |
| Partial failures | Make replacement atomic and report a recovery path if it fails. |

The backup should include every persisted domain collection, including debts. The import preview should show the detected version, currency, record counts, invalid rows, missing references, and whether the operation will replace or merge existing data.

The generic `JSON.parse(JSON.stringify(value))` clone currently used for backup preparation is brittle. Prefer structured cloning where available or explicitly map each record into a serializable DTO.

## Settings and UX improvements

`SettingsView.vue` is the largest architectural hotspot. Divide it into focused child components:

| Component | Responsibility |
|---|---|
| `AppearanceSettings.vue` | Theme, language, currency, and currency position. |
| `PrivacySettings.vue` | Amount masking, privacy mode, screenshot behavior, and timeout. |
| `SecuritySettings.vue` | PIN and real biometric operations. |
| `NavigationSettings.vue` | Optional tab visibility. |
| `CategoryManager.vue` | Category CRUD and usage checks. |
| `DataManagementSettings.vue` | Backup export, import preview, CSV export, and reset. |
| `RecurringSettings.vue` | Recurring transaction management and review. |

Replace `window.confirm()` and `window.alert()` with an accessible localized dialog component. The replacement should support keyboard focus, loading state, cancellation, and consistent mobile behavior.

Use semantic buttons, checkboxes, and switches rather than clickable container elements acting as controls. Add visible success/error states to asynchronous settings operations.

## Analytics and performance

`src/services/stats.ts` contains pure helpers, which is a good design choice, but several functions repeatedly scan the complete transaction list. This is acceptable for a small dataset but can become noticeable after years of personal finance history.

A practical optimization path is:

1. Add benchmark fixtures with 1,000, 10,000, and 100,000 transactions.
2. Measure dashboard and insights render times.
3. Add memoization keyed by transaction revision and requested period.
4. Consolidate repeated scans into a range aggregation function.
5. Move to database-level queries or persisted aggregates only if benchmarks justify the added complexity.

Avoid prematurely optimizing the statistics layer before testing realistic datasets.

## Testing plan

Add unit tests before large refactors so current intended behavior is captured.

### Domain tests

- Expense, income, and transfer balance effects.
- Credit account spending and payments.
- Transaction editing across accounts and transaction types.
- Delete and restore behavior.
- Same-account transfer rejection.
- Archived-account validation.
- Negative, zero, `NaN`, and excessively large amounts.

### Recurring and budget tests

- Month boundary behavior.
- Duplicate prevention.
- Day-of-month clamping.
- Missing account/category references.
- Budget carry-forward and skip markers.
- Undo behavior after automatic budget copying.

### Backup tests

- Export/import round trip.
- Older backup versions.
- Unsupported versions.
- Missing required collections.
- Duplicate IDs.
- Missing references.
- Debts included in export and replacement.
- Merge behavior without overwriting settings.

### UI tests

Keep a small Playwright smoke suite for onboarding, adding a transaction, editing/deleting a transaction, importing a backup, and resetting local data. Add accessibility checks for dialogs, form labels, and switch controls.

## Product ideas that fit the current app

| Idea | Why it fits | Suggested first version |
|---|---|---|
| **Reconciliation mode** | Directly improves trust in balances. | Let users choose an account, enter the real-world balance, and create an adjustment transaction with an audit note. |
| **Recurring transaction review** | The app already posts recurring entries on app open. | Show a “posted this month” inbox with approve, skip, edit, and undo actions instead of silently posting. |
| **Receipt attachments** | The app is mobile-first and already includes a camera dependency. | Attach one compressed image to a transaction, store it in Capacitor Filesystem, and include an opt-in attachment backup. |
| **Budget rollover rules** | Budget carry-forward already exists. | Add per-budget policies: reset, carry unused amount, or carry deficit. |
| **Import diagnostics** | JSON backup is a core portability feature. | Provide a dry-run report with invalid rows, missing references, duplicate IDs, currency differences, and the exact action to be taken. |
| **Multi-currency clarity** | Accounts already have currencies. | Add an explicit base currency and conversion policy; otherwise restrict aggregate totals to same-currency accounts. |
| **Privacy improvements** | Privacy mode and app lock are already present. | Add automatic timeout configuration, screenshot protection on Android where appropriate, and a clear distinction between masking and encryption. |
| **Search quality** | Activity search is already a feature. | Add saved filters, account/category chips, date presets, and normalized search fields. |

## Recommended implementation order

1. Document money units and account-balance semantics.
2. Add finance-domain tests before refactoring.
3. Centralize transaction commands and balance updates.
4. Fix backup completeness and validation, including debts.
5. Improve PIN and biometric behavior.
6. Split the settings screen.
7. Optimize analytics only after measuring realistic datasets.
8. Add accessible dialogs and recoverable database/startup error states.

## Source references

- `README.md` — project purpose, features, scripts, and deployment instructions.
- `src/types/finance.ts` — account, transaction, currency, backup, and finance domain types.
- `src/db/index.ts` — Dexie schema versions and persisted tables.
- `src/stores/transactions.ts` — transaction creation, edits, deletes, restores, and account balance effects.
- `src/stores/settings.ts` — PIN hashing, lock state, biometric flag, and metadata persistence.
- `src/services/backup.ts` — backup export, sanitization, validation, replacement, merge, and CSV export.
- `src/services/stats.ts` — month summaries, category spending, trends, and budget progress.
- `src/features/settings/SettingsView.vue` — settings, data management, category CRUD, and destructive flows.
- `src/components/PinLockModal.vue` — PIN entry, biometric shortcut, and reset behavior.
