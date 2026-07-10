# Construction Finance Platform

Version: 1.0

This document defines the business rules of the financial management platform.
These rules must always take precedence over implementation details.

---

# 1. Projects

A Project is the central business entity.

Every financial transaction belongs to exactly one Project.

A Project may have:

- multiple Contracts
- multiple Purchase Invoices
- multiple Sales Invoices
- multiple Documents
- multiple Bank Transactions

Projects can be:

- Active
- On Hold
- Completed
- Cancelled

Project Code is immutable.

Project Name may change.

Project Manager may change.
Project Manager history must be preserved.

---

# 2. Clients

One Client may have multiple Projects.

Each Project belongs to exactly one Client.

The same Client may have several projects running simultaneously.

Example:

LIDL Serbia

→ Lidl Subotica

→ Lidl Upravna zgrada

→ Lidl Novi Sad

---

# 3. Contracts

One Project may contain multiple Contracts.

Contracts may contain:

- Amendments
- Advance Payments
- Retention
- Documents

Every Contract has:

- Contract Number
- Contract Date
- Currency
- Contract Value
- Status

Contract value may increase through Amendments.

Historical values must never be deleted.

---

# 4. Purchase Invoices

Purchase Invoice belongs to one Vendor.

Purchase Invoice belongs to one Project.

Purchase Invoice may belong to one Contract.

Invoice status:

Received

Waiting for PM Approval

Approved

Waiting for Director Approval

Ready for Payment

Partially Paid

Paid

Cancelled

One Invoice may be paid through multiple payments.

One Payment may settle multiple invoices.

---

# 5. Sales Invoices

Sales Invoice belongs to one Project.

Sales Invoice belongs to one Client.

Sales Invoice may belong to one Contract.

Sales Invoice is created after approved Situation.

---

# 6. Advance Payments

System must support:

Advance received from Client

Advance paid to Vendor

Advance must be tracked separately from invoice payments.

Every advance has:

Remaining Balance

Original Amount

Consumed Amount

---

# 7. Retention

Retention is never treated as payment.

Retention must be tracked separately.

Retention may exist:

Client retains money from Company.

Company retains money from Vendor.

Retention release must be recorded as separate transaction.

---

# 8. Bank Accounts

System supports multiple banks.

Supported currencies:

EUR

RSD

Primary bank:

UniCredit Bank

Bank Statement import must support automatic reconciliation.

---

# 9. Documents

Every entity may contain attached documents.

Supported documents:

Contracts

Amendments

Invoices

Bank Statements

Guarantees

Photos

Correspondence

---

# 10. Approval Workflow

Purchase Invoice

↓

Project Manager Approval

↓

Finance Verification

↓

Director Approval

↓

Payment

---

# 11. Audit

Every change must be recorded.

Record:

User

Date

Old Value

New Value

Reason (optional)

Nothing is permanently deleted.

---

# 12. Multi Currency

System supports:

EUR

RSD

Exchange rates must be stored.

Historical exchange rates must never change.

---

# 13. Guarantees

Support:

Performance Guarantee

Advance Payment Guarantee

Warranty Guarantee

Guarantees must have:

Issue Date

Expiry Date

Amount

Status

Bank

Automatic reminder before expiry.

---

# 14. SEF

Purchase Invoices are received through SEF.

Finance verifies invoices.

Approved invoices are downloaded.

Invoices are forwarded to Accounting.

SEF number must be stored.

---

# 15. Dashboard

Dashboard displays:

Outstanding Payables

Outstanding Receivables

Retention

Advances

Cash Position

Upcoming Payments

Bank Balances

Project Status

Contract Status

Late Payments
