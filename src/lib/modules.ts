export type ModuleDef = {
  order: string;
  slug: string;
  label: string;
};

export const modules: ModuleDef[] = [
  { order: "01", slug: "dashboard", label: "Dashboard" },
  { order: "02", slug: "projects", label: "Projects" },
  { order: "03", slug: "contracts", label: "Contracts" },
  { order: "04", slug: "retentions", label: "Retention" },
  { order: "05", slug: "clients", label: "Clients" },
  { order: "06", slug: "vendors", label: "Vendors" },
  { order: "07", slug: "purchase-invoices", label: "Purchase Invoices" },
  { order: "08", slug: "sales-invoices", label: "Sales Invoices" },
  { order: "09", slug: "treasury", label: "Treasury" },
  { order: "10", slug: "bank-accounts", label: "Bank Accounts" },
  { order: "11", slug: "bank-statements", label: "Bank Statements" },
  { order: "12", slug: "documents", label: "Documents" },
  { order: "13", slug: "reports", label: "Reports" },
  { order: "14", slug: "administration", label: "Administration" },
];
