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
