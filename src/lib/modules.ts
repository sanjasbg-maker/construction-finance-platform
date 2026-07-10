export type ModuleDef = {
  order: string;
  slug: string;
  label: string;
};

export const modules: ModuleDef[] = [
  { order: "01", slug: "dashboard", label: "Dashboard" },
  { order: "02", slug: "projects", label: "Projects" },
  { order: "03", slug: "contracts", label: "Contracts" },
  { order: "04", slug: "clients", label: "Clients" },
  { order: "05", slug: "vendors", label: "Vendors" },
  { order: "06", slug: "purchase-invoices", label: "Purchase Invoices" },
  { order: "07", slug: "sales-invoices", label: "Sales Invoices" },
  { order: "08", slug: "treasury", label: "Treasury" },
  { order: "09", slug: "bank-accounts", label: "Bank Accounts" },
  { order: "10", slug: "bank-statements", label: "Bank Statements" },
  { order: "11", slug: "documents", label: "Documents" },
  { order: "12", slug: "reports", label: "Reports" },
  { order: "13", slug: "administration", label: "Administration" },
];
