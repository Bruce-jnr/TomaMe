# TomaMe Financial Management Module — Superadmin Wallet, Ledger & Withdrawals

I have an existing TomaMe voting application.

The application already has:

- User authentication
- Superadmin functionality
- Elections
- Contestants
- Voting
- Paystack payment integration
- A PostgreSQL database
- Prisma ORM
- Node.js/Express backend

I want to add a complete financial management system directly inside the existing TomaMe application.

DO NOT create a separate application or separate domain.

The new functionality must be available through the existing Superadmin dashboard and must use the existing TomaMe backend, authentication system, PostgreSQL database, Prisma ORM, and Paystack integration.

The goal is to track how much money each eligible user/contestant is entitled to, maintain a complete financial ledger, and allow authorized Superadmins to process withdrawals/transfers through Paystack.

---

# 1. FIRST INSPECT THE EXISTING APPLICATION

Before writing or modifying code, inspect the entire existing project structure and understand:

1. Existing Prisma schema.
2. Existing User model.
3. Existing authentication system.
4. Existing roles and Superadmin authorization.
5. Existing election models.
6. Existing contestant models.
7. Existing voting models.
8. Existing payment/transaction models.
9. Existing Paystack integration.
10. Existing payment verification logic.
11. Existing webhook implementation.
12. Existing frontend architecture.
13. Existing Superadmin dashboard.
14. Existing API route structure.
15. Existing error handling.
16. Existing environment variables.

Do NOT create duplicate versions of models or functionality that already exists.

Reuse existing structures wherever appropriate.

Do not break any existing voting, authentication, election, or Paystack functionality.

---

# 2. FINANCIAL ARCHITECTURE

Create the following logical modules inside the existing TomaMe backend:

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── elections/
│   ├── voting/
│   ├── payments/
│   ├── wallet/
│   ├── ledger/
│   └── withdrawals/
```

If the project already uses a different folder structure, follow the existing architecture rather than unnecessarily restructuring the entire application.

The financial modules should be logically separated even though they are part of the same application.

---

# 3. WALLET SYSTEM

Create a Wallet model if one does not already exist.

Suggested fields:

- id
- userId
- currency
- createdAt
- updatedAt

A user should have only one wallet for a given currency.

Add an appropriate unique constraint such as:

```text
userId + currency
```

Do not use a simple mutable balance field as the authoritative financial record.

The ledger must be the source of truth.

---

# 4. FINANCIAL LEDGER

Create a `LedgerEntry` model.

Suggested fields:

- id
- walletId
- type
- amount
- reference
- description
- metadata
- createdAt

Support transaction types such as:

```text
VOTE_EARNING
PLATFORM_FEE
REFUND
WITHDRAWAL
WITHDRAWAL_REVERSAL
ADJUSTMENT
```

Use an appropriate representation for credit/debit transactions.

Every financial change must have a traceable reference.

The ledger should be append-only.

Do not allow Superadmins to directly edit an existing financial transaction.

If a correction is required, create a new `ADJUSTMENT` or reversal entry with a reason and reference.

---

# 5. IMPORTANT: CONNECT THE LEDGER TO EXISTING PAYMENTS

Find the exact location in the existing TomaMe application where a successful Paystack payment is confirmed.

When a payment associated with a vote is successfully verified, create the appropriate financial ledger entry.

The flow should be:

```text
Customer pays
      ↓
Paystack
      ↓
TomaMe payment verification
      ↓
Payment marked successful
      ↓
Vote confirmed
      ↓
Financial ledger entry created
      ↓
Contestant/User wallet entitlement increases
```

Do NOT create a ledger entry merely because a frontend request says that payment succeeded.

Only create the financial entry after the backend has independently verified the payment.

Make this operation idempotent.

If Paystack sends the same successful event twice, TomaMe must not create two earnings.

Use unique payment/transaction references to prevent duplicate financial entries.

---

# 6. DEFINE HOW CONTESTANT ENTITLEMENT IS CALCULATED

Inspect the existing TomaMe business logic and determine how revenue from votes should be allocated.

Do NOT invent a percentage without asking.

If the application already has a commission/revenue-sharing rule, use it.

If no rule currently exists, make the revenue-sharing percentage configurable in the Superadmin settings rather than hard-coding it.

For example:

```text
Total vote payment: GH₵100

Platform fee: GH₵10

Contestant entitlement: GH₵90
```

The ledger should record both:

```text
VOTE_EARNING
+ GH₵100

PLATFORM_FEE
- GH₵10
```

The resulting available entitlement is:

```text
GH₵90
```

Use the actual TomaMe business rules once identified.

---

# 7. BALANCE CALCULATION

The user's available balance must be calculated securely by the backend.

Do not trust a balance supplied by the frontend.

The financial system should be able to calculate:

```text
Total earnings
- Platform fees
- Successful withdrawals
+ Reversals/refunds where applicable
- Pending/reserved withdrawals
= Available balance
```

Expose a service such as:

```text
getWalletBalance(userId)
```

Return:

```json
{
  "currency": "GHS",
  "totalEarned": 0,
  "totalFees": 0,
  "totalWithdrawn": 0,
  "pendingWithdrawals": 0,
  "availableBalance": 0
}
```

Use the smallest currency unit when interacting with Paystack.

For example:

```text
GH₵600 = 60000 pesewas
```

Do not use floating-point arithmetic for money.

Use integer minor units or an appropriate Decimal type.

---

# 8. WITHDRAWAL MODEL

Create a `Withdrawal` model if one does not already exist.

Suggested fields:

- id
- walletId
- amount
- fee
- netAmount
- currency
- recipientCode
- reference
- paystackTransferCode
- status
- failureReason
- createdAt
- updatedAt

Statuses should include:

```text
PENDING
PROCESSING
SUCCESS
FAILED
REVERSED
```

Add appropriate unique constraints to prevent duplicate transfers.

---

# 9. PAYSTACK TRANSFER PROCESS

Use the existing Paystack backend integration.

The Paystack secret key must remain exclusively on the backend.

Never expose it to:

- browser JavaScript
- frontend environment variables
- API responses
- logs
- Git

The transfer flow should be:

```text
Superadmin requests withdrawal
        ↓
Backend verifies authorization
        ↓
Backend verifies wallet balance
        ↓
Backend creates withdrawal record
        ↓
Backend reserves amount
        ↓
Backend creates/finds Paystack recipient
        ↓
Backend initiates Paystack transfer
        ↓
Paystack processes transfer
        ↓
Paystack webhook
        ↓
TomaMe updates withdrawal
        ↓
Ledger is finalized
```

Do not assume that receiving a successful response from the initial transfer API call means the recipient has received the money.

Use Paystack transfer status/webhooks to determine the final state.

---

# 10. SUPERADMIN WITHDRAWAL MANAGEMENT

Add a new section to the existing Superadmin dashboard:

```text
Financial Management

├── Financial Overview
├── Wallets
├── Ledger
├── Withdrawals
├── Paystack Transfers
└── Financial Reports
```

Do not expose these pages to ordinary users.

Use the existing role/permission system.

If the existing application has only a Superadmin role, use that role initially.

---

# 11. FINANCIAL OVERVIEW DASHBOARD

Create a Superadmin financial dashboard showing:

```text
Total Revenue
Total Platform Fees
Total Contestant Entitlements
Total Withdrawn
Pending Withdrawals
Available Paystack Balance
```

Also show recent:

- payments
- ledger entries
- withdrawals
- failed transfers
- reversed transfers

Use real database data.

Do not use hard-coded statistics.

---

# 12. WALLET MANAGEMENT PAGE

Create a Superadmin wallet page.

Display:

| User | Total Earned | Fees | Withdrawn | Pending | Available |
| ---- | ------------ | ---- | --------- | ------- | --------- |

Allow Superadmin to search by:

- name
- email
- user ID
- contestant

Allow filtering by:

- election
- status
- currency

Clicking a user should display the user's complete financial history.

---

# 13. LEDGER PAGE

Create a complete ledger interface.

Display:

- date
- user
- type
- amount
- reference
- description
- status

Allow filtering by:

- user
- election
- transaction type
- date range
- reference

The Superadmin should be able to view the full audit trail.

Do NOT provide a button that directly edits ledger amounts.

---

# 14. WITHDRAWAL MANAGEMENT

Create a Superadmin withdrawal page.

Display:

```text
Withdrawal ID
User
Amount
Fee
Net Amount
Destination
Reference
Paystack Transfer
Status
Created At
```

Allow the Superadmin to inspect a withdrawal before processing it.

If your business process requires manual approval, implement:

```text
PENDING
    ↓
APPROVED
    ↓
PROCESSING
    ↓
SUCCESS
```

If manual approval is not required, clearly separate the request and processing stages.

Do not allow an already successful withdrawal to be processed again.

---

# 15. APPROVAL SECURITY

Because this system handles real money, do NOT allow any authenticated Superadmin action to blindly transfer money.

Implement appropriate safeguards such as:

- re-authentication for sensitive financial actions
- server-side authorization
- transfer amount limits
- audit logging
- unique withdrawal references
- idempotency
- confirmation before transfer
- optional two-person approval architecture if needed later

At minimum, require the backend to verify the Superadmin's role before every financial operation.

Never rely solely on frontend route protection.

---

# 16. PAYSTACK RECIPIENTS

Support recipient information required for the applicable TomaMe payout methods.

For Ghana, support the appropriate Paystack transfer recipient types, including bank and mobile-money recipients where applicable.

Do not store sensitive payment credentials unnecessarily.

If recipient details need to be saved, encrypt or securely protect sensitive data where appropriate.

Prefer storing Paystack's recipient code/reference rather than repeatedly storing unnecessary sensitive information.

---

# 17. PAYSTACK WEBHOOK

Implement or extend the existing Paystack webhook endpoint.

Verify the Paystack webhook signature before processing.

Handle at minimum:

```text
transfer.success
transfer.failed
transfer.reversed
```

Make webhook processing idempotent.

For example:

```text
Paystack event
      ↓
Check event/reference already processed?
      ↓
YES → return success without repeating operation
      ↓
NO
      ↓
Process event
      ↓
Record event/reference
```

Do not create duplicate ledger entries if Paystack retries a webhook.

---

# 18. DATABASE TRANSACTIONS AND CONCURRENCY

Financial operations must use PostgreSQL transactions where appropriate.

Protect against:

- two withdrawals happening simultaneously
- duplicate payment processing
- duplicate webhook events
- duplicate transfers
- negative balances
- race conditions
- repeated browser requests
- replay attacks

Example:

```text
Available balance = GH₵1,000

Request A = GH₵800
Request B = GH₵800

The backend MUST NOT allow both requests to succeed.
```

Use appropriate row locking, transactions, unique constraints, or other concurrency controls.

---

# 19. IDEMPOTENCY

Implement idempotency for financial operations.

For example:

```text
POST /api/superadmin/withdrawals
Idempotency-Key: unique-request-id
```

If the same request is submitted twice, it must not create two Paystack transfers.

Use unique references throughout the financial workflow.

---

# 20. AUDIT LOGGING

Every sensitive financial action must be logged.

Record:

- admin user
- action
- withdrawal ID
- amount
- reference
- timestamp
- IP address where appropriate
- result
- relevant metadata

Examples:

```text
SUPERADMIN_VIEWED_WALLET
SUPERADMIN_APPROVED_WITHDRAWAL
SUPERADMIN_REJECTED_WITHDRAWAL
PAYSTACK_TRANSFER_INITIATED
PAYSTACK_TRANSFER_SUCCESS
PAYSTACK_TRANSFER_FAILED
PAYSTACK_TRANSFER_REVERSED
LEDGER_ADJUSTMENT_CREATED
```

Never log:

- Paystack secret key
- passwords
- authentication tokens
- private credentials

---

# 21. NEVER ALLOW DIRECT BALANCE EDITING

Do NOT create:

```text
Edit Balance
```

Instead, provide:

```text
Create Adjustment
```

with required fields:

```text
Amount
Reason
Reference
```

Example:

```text
Adjustment: +GH₵500
Reason: Payment reconciliation
Reference: ADJ-00012
Approved by: Superadmin
```

This must create a new ledger entry.

The original financial records must remain untouched.

---

# 22. SUPERADMIN API ROUTES

Create protected backend routes following the existing TomaMe route conventions.

Suggested routes:

```text
GET    /api/superadmin/financial/overview

GET    /api/superadmin/wallets

GET    /api/superadmin/wallets/:userId

GET    /api/superadmin/wallets/:userId/ledger

GET    /api/superadmin/ledger

GET    /api/superadmin/withdrawals

GET    /api/superadmin/withdrawals/:id

POST   /api/superadmin/withdrawals/:id/approve

POST   /api/superadmin/withdrawals/:id/reject

POST   /api/superadmin/withdrawals/:id/process

POST   /api/superadmin/wallets/:userId/adjustment
```

Use the application's existing authentication and route conventions if they differ.

---

# 23. SECURITY

Implement:

- HTTPS in production
- strict authentication
- strict authorization
- secure cookies if cookies are used
- CSRF protection where applicable
- rate limiting
- input validation
- SQL injection protection through Prisma
- secure CORS configuration
- request logging
- audit logging
- security headers
- Paystack webhook signature verification
- idempotency
- transaction locking
- environment-based secrets

Do not use:

```text
Access-Control-Allow-Origin: *
```

for authenticated financial endpoints.

---

# 24. ENVIRONMENT VARIABLES

Inspect existing environment variables first.

Only add variables that are necessary.

Potential variables:

```env
DATABASE_URL=
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
```

If the project already uses these variables, reuse them.

Do not create duplicate Paystack configurations.

---

# 25. NGROK DEVELOPMENT SUPPORT

The application must work when the TomaMe backend is exposed through ngrok.

For example:

```text
Local TomaMe API:

http://localhost:5000

Ngrok:

https://xxxx.ngrok-free.app
```

Paystack webhooks should be configurable for the ngrok URL during development.

Example:

```text
https://xxxx.ngrok-free.app/api/paystack/webhook
```

Do NOT expose PostgreSQL through ngrok.

Only expose the HTTP/HTTPS backend.

Ensure that webhook requests can reach the locally running TomaMe server.

---

# 26. FINANCIAL RECONCILIATION

Create a financial reconciliation mechanism.

The Superadmin should be able to compare:

```text
TomaMe successful payments
        ↓
TomaMe ledger
        ↓
Contestant entitlements
        ↓
TomaMe withdrawals
        ↓
Paystack transfers
```

The system should make it possible to identify discrepancies.

For example:

```text
TomaMe recorded revenue: GH₵50,000
Ledger entitlement:       GH₵40,000
Platform fees:             GH₵10,000
Withdrawals:               GH₵20,000
Pending withdrawals:        GH₵5,000
```

Provide enough information for the Superadmin to understand where the money went.

---

# 27. TESTING

Create tests for at least:

### Wallet

- wallet creation
- wallet retrieval
- balance calculation

### Ledger

- successful vote earning
- platform fee
- adjustment
- refund
- withdrawal
- withdrawal reversal

### Withdrawals

- successful withdrawal
- insufficient balance
- duplicate withdrawal
- concurrent withdrawals
- failed Paystack transfer
- reversed Paystack transfer

### Security

- ordinary user cannot access Superadmin financial endpoints
- non-authenticated user cannot access financial endpoints
- Superadmin cannot access another protected operation without authorization
- frontend cannot manipulate withdrawal amount
- duplicate requests do not create duplicate transfers

### Webhooks

Test duplicate Paystack webhook events and ensure the balance is not changed twice.

---

# 28. FRONTEND DESIGN

Integrate the new financial pages into the existing Superadmin dashboard.

Follow the existing TomaMe:

- colors
- typography
- components
- navigation
- responsive layout
- loading states
- error handling
- notification system

Do not redesign the entire application.

Add a new:

```text
Financial Management
```

section to the existing navigation.

---

# 29. IMPORTANT BUSINESS RULE

The system must clearly distinguish between:

```text
Paystack Account Balance
```

and

```text
TomaMe User Entitlement
```

They are NOT the same thing.

Paystack's balance represents money held in the TomaMe Paystack account.

The TomaMe ledger represents how much each user/contestant is entitled to according to TomaMe's business rules.

The Superadmin dashboard should display both where appropriate.

---

# 30. IMPLEMENTATION REQUIREMENT

Do not simply generate placeholder code.

Inspect the existing project and implement the feature using the actual models, routes, authentication, Paystack integration, and database structure already present.

Before making major schema changes, explain which existing models will be reused and which new models are necessary.

Do not duplicate:

- users
- payments
- Paystack transactions
- authentication
- webhook systems

unless the existing implementation genuinely cannot support the new functionality.

After implementation, provide a concise report containing:

1. Files created.
2. Files modified.
3. Database migrations created.
4. Existing models reused.
5. New models created.
6. API endpoints added.
7. Paystack integration changes.
8. Webhook changes.
9. Authentication/authorization changes.
10. Environment variables required.
11. How the ledger calculates entitlement.
12. How withdrawals work.
13. How duplicate withdrawals are prevented.
14. How to test everything locally with ngrok.

The most important requirement is:

**Do not break the existing TomaMe voting and payment functionality. Build the financial system as a secure, modular extension of the existing application.**
