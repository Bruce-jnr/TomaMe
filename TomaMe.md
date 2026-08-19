# TomaMe — Full-Stack Development Instructions for GPT Sol

## 1. Your Role

You are the senior full-stack software engineer responsible for building **TomaMe**, a production-ready, multi-tenant paid public voting platform.

You are responsible for:

- Understanding the existing repository before changing code
- Studying the provided UI design
- Designing the application architecture
- Implementing the frontend
- Implementing the backend
- Designing the database
- Implementing authentication and authorization
- Implementing paid web voting
- Implementing USSD voting
- Integrating payment providers
- Implementing payment verification
- Implementing candidate vote accounting
- Building organizer administration
- Building Super Admin functionality
- Implementing reporting and analytics
- Implementing security controls
- Writing maintainable production-quality code
- Testing critical workflows
- Documenting setup and deployment

Do not treat this as a prototype.

Build the application with production architecture and maintainability in mind.

---

# 2. Project Name

**TomaMe**

Meaning:

**"Vote for Me"**

Suggested tagline:

**Vote. Support. Celebrate.**

TomaMe is a paid public voting platform for:

- Awards
- Pageants
- Campus competitions
- Talent competitions
- Entertainment awards
- Sports awards
- Reality shows
- Public competitions
- Other paid public voting events

Anyone can vote.

Voters do **not** need to register for an account.

Voting attracts a configurable cost.

Users may purchase multiple votes.

Voting channels:

```text
Web
USSD
```

The architecture should make it possible to add:

```text
SMS
Mobile App
API
```

later.

---

# 3. CRITICAL: Reference the Existing `view` Folder

Before implementing or modifying the frontend, inspect the repository.

There is a folder named:

```text
/view
```

This folder contains the UI/design structure generated for the project.

## The `view` Folder Is the UI Source of Truth

You MUST reference the design structure from the `view` folder when implementing the application.

Do not immediately redesign the interface.

First inspect:

```text
/view
```

and understand:

- Page structure
- Layouts
- Navigation
- Header
- Footer
- Sidebar
- Dashboard structure
- Cards
- Forms
- Tables
- Typography
- Spacing
- Colors
- Buttons
- Candidate cards
- Event cards
- Category layouts
- Voting interface
- Payment screens
- Charts
- Mobile navigation
- Responsive behavior
- Modal/dialog patterns
- Empty states
- Loading states
- Success states
- Error states

Reuse the visual structure as closely as reasonably possible.

---

# 4. Do Not Blindly Copy Generated UI Code

The `view` folder may contain generated/prototype code.

Treat it as:

```text
DESIGN REFERENCE
```

rather than automatically assuming all implementation decisions are production quality.

You may:

- Refactor components
- Extract reusable components
- Improve accessibility
- Improve responsiveness
- Improve TypeScript typing
- Replace hard-coded values with API data
- Replace mock data
- Improve state management
- Improve component architecture
- Fix broken markup
- Improve performance

However, preserve the intended visual appearance and user experience.

---

# 5. UI Implementation Rule

When implementing a page:

```text
1. Find corresponding design in /view
2. Understand its structure
3. Identify reusable components
4. Recreate/refactor it in the actual application
5. Connect it to real backend data
6. Preserve responsive behavior
7. Remove mock data
8. Add proper loading/error/empty states
```

Do not create an unrelated UI when an equivalent design already exists in `/view`.

---

# 6. Repository Inspection

Before coding:

1. Inspect the entire repository.
2. Identify the package manager.
3. Read `package.json`.
4. Identify the existing framework.
5. Identify TypeScript configuration.
6. Inspect `/view`.
7. Inspect existing components.
8. Inspect environment configuration.
9. Inspect existing database configuration.
10. Inspect existing API routes.
11. Identify reusable code.
12. Identify incomplete functionality.
13. Identify mock data.
14. Identify build errors.

Do not unnecessarily replace working project infrastructure.

---

# 7. Preferred Technology Stack

Unless the repository already establishes a compatible alternative, use:

## Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
React Hook Form
Zod
TanStack Query
Recharts
```

## Backend

Preferred:

Nodejs/Express

````



Do not mix architectures without reason.

## Database

```text
PostgreSQL
````

## ORM

```text
Prisma
```

## Temporary Sessions

```text
PostgreSQL
```

## Background Jobs

```text
BullMQ
```

## Storage

Design an abstraction compatible with:

```text
Cloudflare R2
Amazon S3
```

## Initial Payments

Implement a payment-provider abstraction.

Initial provider:

```text
Paystack
```

Architecture must allow:

```text
Hubtel
Flutterwave
```

later.

## USSD

Design provider abstraction.

Initial target:

```text
Arkesel USSD
```

Do not tightly couple the core voting system to Arkesel.

## SMS

Initial target:

```text
Arkesel
```

---

# 8. Core Architecture

The system should follow:

```text
Organization
      │
      ▼
Event
      │
      ▼
Category
      │
      ▼
Candidate
      ▲
      │
Vote Order
      │
      ▼
Payment
      │
      ▼
Payment Verification
      │
      ▼
Vote Transaction
      │
      ▼
Candidate Vote Total
```

Both web and USSD must use the same voting engine.

```text
                 ┌─────────────┐
                 │     WEB     │
                 └──────┬──────┘
                        │
                        │
                 ┌──────▼──────┐
                 │ Voting Core │
                 └──────▲──────┘
                        │
                        │
                 ┌──────┴──────┐
                 │    USSD     │
                 └─────────────┘
```

Do not create separate vote accounting logic for web and USSD.

---

# 9. Multi-Tenant Architecture

TomaMe is multi-tenant.

Each organization should operate independently.

Example:

```text
TomaMe
│
├── Ghana Student Awards
│   ├── 2026 Awards
│   └── 2027 Awards
│
├── Campus Excellence Awards
│
└── Gospel Music Awards
```

Every tenant-owned record must be properly scoped.

Never rely only on frontend filtering.

Tenant authorization must happen server-side.

Important records should include an organization relationship.

---

# 10. Roles

Implement role-based access control.

Initial roles:

```text
SUPER_ADMIN
ORGANIZATION_OWNER
EVENT_ADMIN
FINANCE_ADMIN
RESULTS_VIEWER
```

Do not create accounts for normal public voters.

---

# 11. Super Admin

Super Admin controls TomaMe itself.

Super Admin dashboard should support:

- Organizations
- Events
- Candidates
- Transactions
- Payments
- Platform revenue
- Settlements
- USSD usage
- SMS usage
- Administrators
- Reports
- Audit logs
- System configuration

Super Admin must be isolated from organization-level administration.

---

# 12. Organization Management

Organization fields should include approximately:

```text
id
name
slug
description
logoUrl
email
phone
website
country
currency
primaryColor
secondaryColor
status
createdAt
updatedAt
```

Statuses:

```text
ACTIVE
SUSPENDED
PENDING
ARCHIVED
```

---

# 13. Organization Team

Allow organization owners to invite/manage administrators.

Membership should include:

```text
organizationId
userId
role
status
createdAt
```

A user may potentially belong to multiple organizations.

Do not put a single `organizationId` directly on the global User model if memberships are required.

Use a membership relationship.

---

# 14. Events

Organizations create voting events.

Event fields:

```text
id
organizationId
name
slug
description
bannerUrl
startAt
endAt
timezone
currency
defaultVotePrice
minimumVotes
maximumVotesPerTransaction
status
resultsVisibility
webVotingEnabled
ussdVotingEnabled
createdAt
updatedAt
```

Statuses:

```text
DRAFT
SCHEDULED
ACTIVE
PAUSED
ENDED
CANCELLED
ARCHIVED
```

---

# 15. Event Time Rules

Backend must enforce voting time.

Never trust frontend countdowns.

Before creating a vote order verify:

```text
event.status == ACTIVE

AND

currentTime >= startAt

AND

currentTime < endAt
```

Also account for explicitly paused events.

---

# 16. Categories

Each event contains categories.

Fields:

```text
id
eventId
name
slug
description
imageUrl
votePriceOverride
displayOrder
status
createdAt
updatedAt
```

If `votePriceOverride` is null:

```text
use event.defaultVotePrice
```

---

# 17. Candidates

Candidate fields:

```text
id
organizationId
eventId
categoryId
name
slug
candidateCode
photoUrl
biography
slogan
socialLinks
displayOrder
status
cachedVoteCount
createdAt
updatedAt
```

Candidate codes must be unique within an appropriate event scope.

Examples:

```text
EOY01
EOY02
AOTY04
```

---

# 18. Candidate Codes

Candidate codes are important because they will be used by:

```text
Web search
USSD
QR codes
Campaign posters
Share links
Future SMS voting
```

Provide candidate code generation.

Allow administrators to edit the generated code before publishing when appropriate.

Validate uniqueness server-side.

---

# 19. Public Website

Use `/view` as the design reference.

Implement:

```text
/
```

Homepage should include:

- TomaMe branding
- Search
- Active events
- Trending/featured candidates
- Event discovery
- How voting works
- USSD information
- Organizer CTA

---

# 20. Event Discovery

Implement:

```text
/events
```

Allow:

```text
Live
Upcoming
Ended
```

Search/filter by:

- Event
- Organization
- Event type
- Status

---

# 21. Event Page

Example:

```text
/events/[slug]
```

Show:

- Banner
- Logo
- Event name
- Organizer
- Description
- Status
- Closing date/time
- Countdown
- Categories
- Search
- Sharing

---

# 22. Category Page

Example:

```text
/events/[eventSlug]/categories/[categorySlug]
```

Show candidates.

Candidate card should prominently display:

```text
Photo
Name
Candidate Code
Vote CTA
```

If public results are enabled, display the appropriate configured result information.

---

# 23. Candidate Page

Example:

```text
/candidates/[candidateCode]
```

Display:

- Candidate image
- Candidate name
- Candidate code
- Category
- Event
- Biography
- Slogan
- Share
- Vote CTA
- USSD voting instructions

The candidate identity must be extremely clear to minimize accidental votes.

---

# 24. Universal Search

Search should support:

```text
Candidate Name
Candidate Code
Event Name
Category
Organization
```

Candidate code searches should receive high priority.

Example:

```text
EOY04
```

should quickly locate the candidate.

---

# 25. Public Voters Do Not Need Accounts

Do not require:

```text
Registration
Password
Login
```

for normal voting.

Voting should be optimized for conversion and simplicity.

---

# 26. Web Voting Flow

Implement:

```text
Candidate
    ↓
Select Votes
    ↓
Review
    ↓
Contact Details
    ↓
Payment
    ↓
Payment Verification
    ↓
Vote Credited
    ↓
Confirmation
```

---

# 27. Vote Quantity

Provide quick options such as:

```text
1
5
10
20
50
100
500
```

and:

```text
Custom
```

Respect event configuration:

```text
minimumVotes
maximumVotesPerTransaction
```

---

# 28. Server-Side Pricing

This is a critical security requirement.

Never trust:

```text
amount
unitPrice
total
```

provided by the frontend.

Frontend should send approximately:

```json
{
  "candidateId": "...",
  "quantity": 50,
  "phone": "...",
  "email": "..."
}
```

Backend must retrieve candidate/category/event and calculate the amount itself.

Example:

```text
quantity = 50
votePrice = GH₵1

total = 50 × 1
total = GH₵50
```

---

# 29. Monetary Values

Do not use floating-point arithmetic for money.

Store monetary values using either:

```text
integer minor units
```

or a safe decimal database type.

For GHS, preferably store pesewas where appropriate.

Example:

```text
GH₵1.00 = 100
GH₵50.00 = 5000
```

Be consistent across the entire system.

---

# 30. Vote Order

Create the vote order before initiating payment.

Fields:

```text
id
organizationId
eventId
categoryId
candidateId
quantity
unitPrice
amount
currency
voterPhone
voterEmail
channel
paymentProvider
paymentReference
paymentStatus
voteStatus
createdAt
paidAt
processedAt
```

Channel:

```text
WEB
USSD
SMS
MOBILE_APP
```

---

# 31. Vote Order Status

Payment status:

```text
PENDING
PROCESSING
PAID
FAILED
CANCELLED
EXPIRED
REFUNDED
```

Vote processing status:

```text
PENDING
CREDITED
REVERSED
FAILED
```

Keep payment status and vote-processing status conceptually separate.

---

# 32. Payment Provider Abstraction

Create an interface similar to:

```typescript
interface PaymentProvider {
  initializePayment(...): Promise<...>;
  initializeMobileMoney(...): Promise<...>;
  verifyPayment(...): Promise<...>;
  verifyWebhook(...): Promise<...>;
  getTransaction(...): Promise<...>;
}
```

Implement initial provider:

```text
Paystack
```

Prepare architecture for:

```text
Hubtel
Flutterwave
```

Do not spread Paystack-specific logic throughout voting services.

---

# 33. Payment References

Every payment must have a secure unique reference.

Example:

```text
TOMA-2026-X83KD92
```

Do not use sequential database IDs as public payment references.

Enforce uniqueness at database level.

---

# 34. Payment Webhook

Implement secure webhook endpoint(s).

Example:

```text
POST /api/webhooks/paystack
```

Webhook processing must:

```text
1. Validate provider signature
2. Extract transaction reference
3. Find corresponding order
4. Check whether already processed
5. Verify transaction with provider if appropriate
6. Verify currency
7. Verify amount
8. Verify successful payment
9. Process vote atomically
10. Return appropriate success response
```

---

# 35. Idempotency

Payment providers may deliver the same webhook repeatedly.

Example:

```text
Webhook 1
Webhook 2
Webhook 3
```

All may represent one payment.

The system MUST only credit votes once.

Use:

- Unique payment references
- Database constraints
- Transaction locking
- Processed timestamps/status
- Idempotent processing

Never rely on an in-memory boolean.

---

# 36. Vote Crediting Transaction

When a verified payment is processed:

```text
BEGIN TRANSACTION

Lock Vote Order

Check payment not previously processed

Validate expected amount

Validate currency

Validate payment success

Create/update Payment record

Create Vote Transaction

Increment candidate cached vote count

Mark Vote Order PAID

Mark Vote Status CREDITED

Set paidAt

Set processedAt

Create Audit/System Log

COMMIT
```

If anything fails:

```text
ROLLBACK
```

---

# 37. Vote Ledger

The authoritative vote record is:

```text
vote_transactions
```

Do not treat:

```text
candidate.cachedVoteCount
```

as the authoritative record.

Candidate total must always be reconstructable:

```sql
SUM(vote_transactions.quantity)
```

for valid credited transactions.

The cached total exists for performance.

---

# 38. Vote Transaction

Fields approximately:

```text
id
organizationId
eventId
categoryId
candidateId
orderId
paymentId
quantity
unitPrice
amount
currency
channel
paymentReference
createdAt
```

Vote transactions should be append-oriented.

Avoid deleting financial/voting history.

---

# 39. Refunds and Reversals

Never delete the original successful transaction.

If a payment is legitimately reversed/refunded, create controlled accounting/vote adjustment records.

Maintain a complete history.

Example:

```text
Original:
+100 votes

Reversal:
-100 votes
```

Every reversal must contain:

```text
reason
admin/provider
reference
timestamp
```

---

# 40. USSD Voting

Implement USSD as another interface into the same voting system.

Initial target:

```text
Arkesel USSD
```

Architecture:

```text
Arkesel
   ↓
USSD Callback
   ↓
USSD Session Service
   ↓
Candidate/Event Selection
   ↓
Vote Order Service
   ↓
Payment Service
   ↓
Payment Verification
   ↓
Vote Ledger
```

---

# 41. Arkesel Isolation

Create something similar to:

```text
UssdProvider
```

and an Arkesel implementation.

Do not place Arkesel-specific request parsing throughout the voting domain.

Example structure:

```text
ussd/
├── interfaces/
├── providers/
│   └── arkesel/
├── sessions/
├── menus/
└── ussd.service.ts
```

---

# 42. USSD Session Storage

Use PostgreSQL for active USSD sessions with short expiry timestamps.

Store approximately:

```text
sessionId
phoneNumber
network
eventId
categoryId
candidateId
quantity
currentStep
createdAt
expiresAt
```

USSD sessions are temporary.

Do not unnecessarily persist every temporary state in PostgreSQL.

Persistent USSD request logging may be implemented separately for diagnostics.

---

# 43. USSD States

Implement a state machine.

Possible states:

```text
START
MAIN_MENU
SELECT_EVENT
SELECT_CATEGORY
SELECT_CANDIDATE
ENTER_CANDIDATE_CODE
ENTER_QUANTITY
CONFIRM_ORDER
PAYMENT_PENDING
COMPLETED
```

Avoid deeply nested conditional spaghetti.

---

# 44. Preferred USSD Flow

Optimize for candidate codes.

Example:

```text
Dial *XXX#

Welcome to TomaMe

1. Vote by Candidate Code
2. Browse Events
3. Check Transaction
```

User selects:

```text
1
```

Then:

```text
Enter Candidate Code:
```

User:

```text
EOY04
```

Response:

```text
Ama Mensah
Entrepreneur of the Year

Enter number of votes:
```

User:

```text
20
```

Response:

```text
Ama Mensah
20 Votes
Total: GH₵20

1. Pay & Vote
2. Cancel
```

---

# 45. USSD Payment

When user selects:

```text
Pay & Vote
```

do NOT credit votes.

Instead:

```text
Create Vote Order
      ↓
Initiate Mobile Money
      ↓
End/continue USSD session as appropriate
      ↓
Wait for payment provider confirmation
      ↓
Webhook verifies payment
      ↓
Credit votes
      ↓
Send SMS confirmation
```

---

# 46. USSD Session Timeout

USSD sessions can expire.

The payment architecture must not depend on the session remaining open.

Once a valid vote order and payment request exist, payment can complete asynchronously.

The payment webhook should complete vote crediting even if the USSD session has ended.

---

# 47. USSD Phone Number

Normalize Ghana numbers.

Example:

```text
0241234567
```

normalize to:

```text
233241234567
```

Create a reusable phone normalization utility.

Do not duplicate phone formatting logic.

---

# 48. SMS

Create an SMS abstraction.

Example:

```typescript
interface SmsProvider {
  send(...): Promise<...>;
}
```

Initial implementation:

```text
Arkesel
```

Use SMS for:

- Vote confirmation
- Failed payment notification when appropriate
- Organizer notifications
- Future OTP functionality

---

# 49. Vote Confirmation SMS

Example:

```text
TomaMe: Your 50 votes for Ama Mensah were successfully counted. Amount: GH₵50. Ref: TOMA-X83KD92. Thank you for voting.
```

Do not claim votes were counted before payment/vote processing succeeds.

---

# 50. Results

Support:

```text
EXACT_TOTALS
PERCENTAGES
RANKING_ONLY
HIDDEN_UNTIL_END
ADMIN_ONLY
MANUAL_RELEASE
```

The API must enforce visibility rules.

Do not simply hide sensitive results using CSS/frontend logic.

---

# 51. Real-Time Results

Start with a maintainable solution.

Possible MVP:

```text
Polling every 5–10 seconds
```

Later:

```text
WebSockets
or
Server-Sent Events
```

Do not introduce unnecessary real-time infrastructure if polling satisfies the MVP.

---

# 52. Organizer Dashboard

Reference `/view`.

Implement:

```text
/dashboard
```

Navigation:

```text
Overview
Events
Categories
Candidates
Transactions
Results
Analytics
Reports
Team
Settlements
Audit Logs
Settings
```

---

# 53. Dashboard KPIs

Display:

```text
Total Votes
Gross Revenue
Successful Transactions
Active Candidates
Active Events
Payment Success Rate
```

Also display:

```text
Web Votes
USSD Votes
Web Revenue
USSD Revenue
```

---

# 54. Analytics

Provide:

- Votes over time
- Revenue over time
- Votes by channel
- Revenue by channel
- Votes by category
- Top candidates
- Payment success rate
- Payment method breakdown
- Failed payment rate
- Average votes per transaction
- Average transaction value

Use aggregate queries efficiently.

Avoid loading every transaction into memory to calculate dashboards.

---

# 55. Transactions

Create searchable/filterable transaction management.

Columns:

```text
Reference
Date
Candidate
Category
Channel
Votes
Amount
Payment Method
Provider
Status
```

Filters:

```text
Date
Event
Category
Candidate
Channel
Payment Method
Status
Provider
```

---

# 56. Candidate Analytics

Show:

```text
Total Votes
Web Votes
USSD Votes
Total Revenue
Transactions
Votes Today
Revenue Today
Largest Vote Purchase
Average Votes Per Transaction
```

---

# 57. Event Management

Organizer should be able to:

- Create event
- Edit event
- Schedule event
- Publish event
- Pause voting
- Resume voting
- End event
- Archive event
- Configure results
- Enable/disable web voting
- Enable/disable USSD
- Configure vote price

Sensitive state changes must generate audit logs.

---

# 58. Event Creation Wizard

Reference `/view`.

Suggested steps:

```text
1. Event Information
2. Schedule
3. Vote Pricing
4. Payment Options
5. Categories
6. Candidates
7. Results Visibility
8. Branding
9. Review
10. Publish
```

Persist drafts so admins do not lose progress.

---

# 59. Candidate Management

Support:

- Create candidate
- Edit candidate
- Upload photo
- Assign category
- Candidate code
- Biography
- Slogan
- Social links
- Enable/disable
- Reorder

Implement bulk import later if not required for initial MVP.

---

# 60. File Uploads

Do not store image binary data directly in PostgreSQL.

Use object storage.

Validate:

```text
MIME type
File extension
File size
```

Generate safe unique filenames.

Do not trust original uploaded filenames.

---

# 61. Authentication

Admin authentication must be separate from public voting.

Implement:

- Secure login
- Logout
- Password reset
- Session expiration
- Role authorization
- Organization authorization

Prefer secure HTTP-only cookies for browser sessions.

Do not store sensitive authentication tokens in `localStorage` without strong reason.

---

# 62. Password Security

Use:

```text
Argon2id
```

or an appropriately configured secure password hashing implementation.

Never store plaintext passwords.

---

# 63. Admin 2FA

Architecture should support TOTP-based two-factor authentication.

At minimum design for:

```text
Google Authenticator
Microsoft Authenticator
1Password
Authy-compatible TOTP
```

Super Admin should strongly require 2FA.

---

# 64. Audit Logs

Record sensitive administrative actions.

Fields:

```text
id
organizationId
userId
action
resourceType
resourceId
oldValue
newValue
ipAddress
userAgent
createdAt
```

Examples:

```text
EVENT_CREATED
EVENT_PUBLISHED
EVENT_PAUSED
EVENT_RESUMED
EVENT_ENDED

CANDIDATE_CREATED
CANDIDATE_UPDATED
CANDIDATE_DISABLED

VOTE_PRICE_CHANGED

RESULTS_RELEASED

ADMIN_INVITED

SETTLEMENT_PROCESSED
```

Organization admins must not be able to delete audit history.

---

# 65. Webhook Logs

Maintain webhook diagnostics.

Fields:

```text
provider
eventType
reference
signatureValid
processed
processingResult
receivedAt
processedAt
```

Be careful about storing raw provider payloads if they contain sensitive information.

Redact where appropriate.

---

# 66. Platform Fees

Architecture should support configurable platform fees.

Possible models:

```text
Percentage
Flat Fee
Hybrid
```

Example:

```text
Gross Payment: GH₵100
Platform Fee: GH₵5
Organizer Share: GH₵95
```

Gateway fees should be tracked separately where data is available.

---

# 67. Settlements

If TomaMe receives funds before organizer payout, implement settlement accounting.

Fields:

```text
id
organizationId
eventId
grossAmount
gatewayFees
platformFees
netAmount
status
reference
periodStart
periodEnd
processedAt
createdAt
```

Statuses:

```text
PENDING
PROCESSING
PAID
FAILED
```

Do not build automated payouts until the underlying payment-provider settlement model is confirmed.

---

# 68. Reports

Provide:

```text
Event Report
Candidate Report
Category Report
Transaction Report
Revenue Report
USSD Report
Payment Report
Settlement Report
```

Exports eventually:

```text
PDF
XLSX
CSV
```

Generate large reports asynchronously when necessary.

---

# 69. Database Models

At minimum expect models similar to:

```text
User
Organization
OrganizationMembership
Event
Category
Candidate
VotePackage
VoteOrder
Payment
VoteTransaction
VoteAdjustment
Settlement
PlatformFee
AuditLog
WebhookLog
Notification
```

USSD sessions live in PostgreSQL and are deleted after expiry.

---

# 70. Database Constraints

Use database-level constraints for critical integrity.

Examples:

```text
unique organization slug
unique event slug where appropriate
unique candidate code within event
unique payment reference
unique provider transaction reference
unique vote transaction per successfully processed order
```

Application validation alone is not sufficient.

---

# 71. Indexing

Create indexes for common queries.

Examples:

```text
organizationId
eventId
categoryId
candidateId
candidateCode
paymentReference
paymentStatus
createdAt
event status
```

Use composite indexes where query patterns justify them.

---

# 72. Avoid N+1 Queries

Pay attention to:

- Event candidate lists
- Category results
- Dashboard statistics
- Transaction pages

Use Prisma selection/include carefully.

Paginate large datasets.

---

# 73. Pagination

Transactions, audit logs, candidates and events should use server-side pagination.

Do not return tens of thousands of records to the browser.

Prefer cursor pagination for very large/high-write transaction datasets where practical.

---

# 74. Input Validation

Use Zod or backend DTO validation.

Validate all:

```text
IDs
Candidate codes
Vote quantities
Phone numbers
Email
Currency
Dates
Slugs
Payment references
Webhook inputs
```

Never assume frontend validation is sufficient.

---

# 75. Rate Limiting

Rate-limit sensitive endpoints:

```text
Login
Password Reset
Search
Vote Order Creation
Payment Initialization
USSD Callbacks
```

Webhook endpoints require careful provider-aware protection and signature validation.

Do not accidentally block legitimate provider retries.

---

# 76. API Response Structure

Use consistent API responses.

For example:

```json
{
  "success": true,
  "data": {},
  "message": "..."
}
```

Errors:

```json
{
  "success": false,
  "error": {
    "code": "EVENT_CLOSED",
    "message": "Voting for this event has ended."
  }
}
```

Use meaningful error codes.

---

# 77. Error Handling

Create centralized error handling.

Do not expose:

```text
Stack traces
Database errors
Secret keys
Internal provider responses
```

to public clients.

Log enough information server-side for debugging.

---

# 78. Environment Variables

Use environment variables for:

```text
DATABASE_URL
PAYSTACK_PUBLIC_KEY
PAYSTACK_SECRET_KEY
PAYSTACK_WEBHOOK_SECRET

ARKESEL_API_KEY
ARKESEL_SENDER_ID
ARKESEL_USSD_CONFIG

STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
STORAGE_BUCKET
STORAGE_ENDPOINT

APP_URL
API_URL

SESSION_SECRET
```

Use the actual variable names required by providers when integrating them.

Never commit real secrets.

Provide:

```text
.env.example
```

---

# 79. Logging

Use structured logs.

Important events:

```text
Payment initialized
Payment verified
Webhook received
Webhook rejected
Vote credited
Vote processing failed
USSD session error
SMS failure
Authentication failure
```

Never log:

```text
Passwords
Secret keys
Full card details
Sensitive authentication tokens
```

Mask phone numbers where appropriate.

---

# 80. Background Jobs

Use BullMQ for asynchronous work such as:

```text
SMS confirmations
Email confirmations
Report generation
Analytics aggregation
Event closing
Notification retries
```

Critical vote crediting itself should not depend on an unreliable delayed job when it can safely be completed transactionally during verified payment processing.

---

# 81. Automatic Event Status

Implement scheduled handling for:

```text
SCHEDULED → ACTIVE
ACTIVE → ENDED
```

However, every vote/order API must still independently validate event time.

Do not rely solely on the scheduler.

---

# 82. Loading States

Follow `/view`.

Use skeletons where appropriate.

Provide loading states for:

```text
Events
Candidates
Results
Transactions
Analytics
Payment Verification
```

---

# 83. Empty States

Provide useful empty states.

Example:

```text
No live events right now.
Check back soon.
```

Admin:

```text
You haven't created an event yet.

[Create Event]
```

---

# 84. Payment UI States

Implement:

```text
INITIAL
CREATING_ORDER
INITIALIZING_PAYMENT
WAITING_FOR_PAYMENT
VERIFYING_PAYMENT
SUCCESS
FAILED
EXPIRED
```

Prevent duplicate button submissions.

---

# 85. Accessibility

Maintain:

- Semantic HTML
- Proper labels
- Keyboard accessibility
- Focus states
- Sufficient contrast
- Large touch targets
- Accessible dialogs
- Screen-reader labels

Do not sacrifice accessibility to reproduce prototype code literally.

---

# 86. Responsive Requirements

The public voting flow is mobile-first.

Test at least:

```text
Small phone
Large phone
Tablet
Laptop
Desktop
```

Candidate selection and payment must work comfortably on small screens.

---

# 87. Performance

Optimize:

- Candidate images
- Event banners
- Database queries
- Search
- Public event pages
- Dashboard aggregates

Use:

- Next.js image optimization where appropriate
- Caching where safe
- In-process caching for short-lived non-authoritative data
- Database indexes
- Pagination

Never cache payment/vote-processing decisions in a way that compromises correctness.

---

# 88. Testing

Write automated tests for critical logic.

At minimum test:

### Voting

```text
Correct vote price calculation
Minimum quantity
Maximum quantity
Closed event
Paused event
Disabled candidate
Wrong category/event relationships
```

### Payments

```text
Valid payment
Wrong amount
Wrong currency
Failed payment
Duplicate webhook
Unknown reference
Already processed order
```

### Vote Accounting

```text
One payment credits once
50 purchased votes adds exactly 50
Duplicate webhook adds zero extra votes
Failed payment adds zero votes
```

### Tenant Isolation

```text
Organization A cannot manage Organization B
```

### Authorization

```text
Finance admin cannot perform forbidden event actions
Results viewer cannot edit candidates
```

---

# 89. USSD Testing

Test:

```text
New session
Candidate-code lookup
Invalid candidate
Inactive event
Quantity validation
Payment initialization
Session timeout
Duplicate callback
Malformed input
Payment success after session expiration
```

---

# 90. Payment Test Mode

Use provider sandbox/test mode during development.

Never use live payment credentials in automated tests.

Create provider mocks for unit/integration testing.

---

# 91. Seed Data

Create useful development seed data.

Example:

```text
Organization:
Ghana Student Awards

Event:
Ghana Student Awards 2026

Categories:
Entrepreneur of the Year
Student Leader of the Year
Content Creator of the Year

Candidates:
At least 3–5 per category
```

Do not seed production automatically.

---

# 92. Development Workflow

Work incrementally.

Recommended order:

```text
Phase 1
Repository + /view analysis

Phase 2
Database architecture

Phase 3
Authentication + multi-tenancy

Phase 4
Organization management

Phase 5
Events/categories/candidates

Phase 6
Public website

Phase 7
Web voting

Phase 8
Payment integration

Phase 9
Vote ledger

Phase 10
Organizer dashboard

Phase 11
USSD

Phase 12
SMS

Phase 13
Analytics

Phase 14
Reports

Phase 15
Super Admin

Phase 16
Testing/security hardening
```

Do not attempt to implement the entire platform in one uncontrolled change.

---

# 93. After Each Major Phase

Run:

```text
Lint
Type checking
Tests
Production build
```

Fix errors before proceeding.

Do not leave the project knowingly broken between phases.

---

# 94. Code Quality

Use:

- Strong TypeScript typing
- Small focused functions
- Clear service boundaries
- Reusable components
- Descriptive naming
- Centralized constants
- Shared validation schemas where appropriate

Avoid:

```text
any
```

unless genuinely necessary.

Avoid giant files.

Avoid duplicated business logic.

---

# 95. Comments

Comment:

```text
WHY
```

when behavior is not obvious.

Do not fill code with comments explaining trivial syntax.

Payment and vote-processing code should contain concise comments around important integrity decisions.

---

# 96. Documentation

Maintain a project README containing:

```text
Project overview
Architecture
Requirements
Local installation
Environment variables
Database setup
Migrations
Seed data
Running development server
Running tests
Building production
Payment webhook setup
Arkesel USSD setup
Arkesel SMS setup
Deployment
```

---

# 97. Do Not Invent Provider Details

When implementing:

```text
Paystack
Arkesel
Hubtel
Flutterwave
```

do not invent:

- API URLs
- Request schemas
- Webhook signatures
- Authentication headers
- Callback formats

Use current official provider documentation.

Keep provider-specific code isolated so changes are easy.

---

# 98. Critical Financial Integrity Rules

These rules are non-negotiable.

### Rule 1

```text
No verified successful payment
=
No credited votes
```

### Rule 2

```text
One successful payment
=
One vote-crediting transaction
```

### Rule 3

Duplicate webhook:

```text
0 additional votes
```

### Rule 4

Frontend never controls authoritative price.

### Rule 5

Frontend never controls payment status.

### Rule 6

Frontend never directly changes candidate totals.

### Rule 7

Every credited vote must be traceable to a valid vote transaction.

### Rule 8

Every vote transaction must be traceable to a payment/order.

### Rule 9

Candidate totals must be reconstructable from the ledger.

### Rule 10

Do not delete financial/vote history to "fix" totals.

Use controlled adjustments.

---

# 99. Critical Multi-Tenant Rule

Never perform a query like:

```typescript
findUnique({ where: { id } });
```

for tenant-owned administrative resources and assume possession of the ID grants access.

Always verify organization membership/ownership.

Conceptually:

```text
Authenticated User
       ↓
Membership
       ↓
Organization
       ↓
Requested Resource
```

---

# 100. Critical UI Rule

Do not build the application from generic assumptions when the `/view` folder contains the intended design.

For every major frontend page:

```text
CHECK /view FIRST
```

Preserve its:

```text
Visual hierarchy
Layout
Spacing
Navigation structure
Component appearance
Responsive intent
Branding
```

Then connect the design to the real TomaMe application architecture.

---

# 101. Definition of Done

A feature is not complete merely because the page appears visually correct.

A feature is complete when:

```text
UI matches /view design intent
+
Responsive behavior works
+
Backend is implemented
+
Database persistence works
+
Authorization works
+
Validation works
+
Loading states work
+
Error states work
+
Security considerations are handled
+
Tests cover critical logic
+
Production build succeeds
```

---

# 102. Initial MVP Definition

The first production-capable MVP should provide:

```text
TomaMe Public Website

Organization Administration

Event Management

Category Management

Candidate Management

Candidate Codes

Candidate Search

Public Candidate Pages

Paid Web Voting

Vote Quantity Selection

Server-Side Pricing

Paystack Integration

Mobile Money/Card Payment

Webhook Verification

Idempotent Vote Processing

Candidate Vote Ledger

Candidate Totals

Public Results

Results Visibility Controls

Transaction Management

Organizer Analytics

Web vs USSD Channel Tracking

Arkesel USSD Integration

USSD Candidate-Code Voting

USSD Mobile Money Flow

Arkesel SMS Confirmation

Audit Logs

Super Admin

Basic Reports

Responsive UI based on /view
```

---

# 103. Final Expected User Journey — Web

```text
Visit TomaMe
      ↓
Search Candidate
      ↓
Open Candidate
      ↓
Choose 50 Votes
      ↓
Backend Calculates GH₵50
      ↓
Review Candidate + Votes + Amount
      ↓
Enter Phone
      ↓
Pay
      ↓
Provider Confirms Payment
      ↓
Webhook Verified
      ↓
Vote Ledger +50
      ↓
Candidate Total +50
      ↓
Confirmation
      ↓
SMS
```

---

# 104. Final Expected User Journey — USSD

```text
Dial TomaMe USSD
      ↓
Vote by Candidate Code
      ↓
Enter EOY04
      ↓
System Finds Ama Mensah
      ↓
Enter 50 Votes
      ↓
Backend Calculates GH₵50
      ↓
Confirm
      ↓
MoMo Payment Request
      ↓
User Approves
      ↓
Provider Confirms
      ↓
Webhook Verified
      ↓
Vote Ledger +50
      ↓
Candidate Total +50
      ↓
SMS Confirmation
```

---

# 105. Final Instruction

Begin by inspecting the repository and the complete:

```text
/view
```

directory.

Do not immediately start rewriting files.

First determine:

```text
What already exists
What /view contains
What can be reused
What must be refactored
What backend infrastructure exists
What database infrastructure exists
What dependencies are already installed
```

Then create a concise implementation plan and execute the work incrementally.

The `view` folder defines the intended **visual design and structural reference**.

The backend/database architecture defined in this specification establishes the intended **business and system architecture**.

The central TomaMe invariant is:

```text
WEB ──┐
      │
      ├──► VOTE ORDER
      │        ↓
USSD ─┘     PAYMENT
               ↓
        VERIFIED PAYMENT
               ↓
         VOTE TRANSACTION
               ↓
            CANDIDATE
               ↓
             RESULTS
```

Never compromise payment verification, vote accounting, tenant isolation, or auditability for implementation convenience.

Build TomaMe as a real paid-voting platform, not merely a UI prototype.
