@AGENTS.md
@BUSINESS_RULES.md

# Construction Finance Platform

## Purpose

Develop a modern financial management platform for a construction company.

The application replaces multiple Excel files and manual processes.

It must support complete financial lifecycle of construction projects.

---

## Technology Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL (Neon)
- Vercel

---

## Architecture

Use App Router.

Use Server Components whenever possible.

Use Server Actions instead of REST APIs unless necessary.

Business logic must never be duplicated.

Every database table must contain:

- id
- createdAt
- updatedAt
- createdBy
- updatedBy

Soft delete whenever possible.

---

## Main Modules

Dashboard

Projects

Contracts

Clients

Vendors

Purchase Invoices

Sales Invoices

Treasury

Bank Accounts

Bank Statements

Documents

Reports

Administration

---

## Business Rules

One Client may have multiple Projects.

One Project belongs to one Client.

One Project may contain multiple Contracts.

One Contract belongs to one Project.

One Vendor Invoice belongs to one Project.

One Vendor Invoice may be paid through multiple payments.

One Bank Payment may settle multiple invoices.

Support:

- Advance payments to Vendors
- Advance payments from Clients
- Retention (Guarantee Deposit)
- Multiple bank accounts
- Multiple currencies (EUR and RSD)
- Partial payments
- Approval workflow
- Audit log

---

## Approval Workflow

Vendor Invoice

↓

Project Manager approval

↓

Finance verification

↓

Director payment approval

↓

Payment execution

---

## UI Principles

Clean.

Minimal.

Professional.

Do not build spreadsheet-like interfaces unless requested.

Forms must be simple.

Navigation should be left sidebar.

Dashboard should contain KPIs.

---

## Coding Rules

Never generate placeholder business logic.

Ask before changing database structure.

Always explain architectural decisions.

Prefer reusable components.

Use TypeScript strictly.

Use Prisma relations correctly.

---

## Goal

The platform must become the primary financial operating system of the company.

---

## Module Implementation Pattern

`src/app/(app)/vendors/` is the reference implementation — a simple master-data
module built out to full CRUD. Copy its structure for every other module rather
than inventing a new one:

```
src/app/(app)/<module>/
  page.tsx           Server Component — list (table via plain `prisma`), empty
                      state, "Add" link, Edit link + DeleteButton per row
  new/page.tsx        Server Component wrapper — renders <ModuleForm action={create...} />
  [id]/edit/page.tsx  Server Component — fetches the record (notFound() if missing),
                      renders <ModuleForm action={update....bind(null, id)} defaultValues={...} />
  <Module>Form.tsx    "use client" — shared create/edit form via useActionState,
                       inline field errors from Zod, pending state on submit
  actions.ts          "use server" — create/update/remove; role check via
                       getCurrentUser() (VIEWER is read-only, checked in the
                       action itself, not just hidden in the UI); Zod validation;
                       writes go through withUser(user.id) from src/lib/prisma.ts,
                       never the plain `prisma` export
  schema.ts           Zod schema + a toXData() mapper that turns empty-string
                       form fields into `null` for storage
```

Reusable pieces already built, don't recreate: `src/components/DeleteButton.tsx`
(confirm-then-submit delete form), `src/lib/current-user.ts`
(`getCurrentUser()`/`listUsers()`), `src/lib/prisma.ts` (`prisma` for reads,
`withUser(userId)` for writes — soft delete and createdBy/updatedBy/audit-log
diffing happen automatically inside that extension, an action never sets those
fields or writes to `AuditLog` itself).

Modules with more going on than plain master data (Purchase Invoices' approval
workflow, Contracts' amendments, anything needing a real detail page rather than
"edit page doubles as detail view") will need to extend this pattern, not follow
it verbatim — but the list/new/edit/actions/schema split and the
role-check-inside-the-action rule still apply everywhere.
