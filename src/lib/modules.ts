export type ModuleDef = {
  order: string;
  slug: string;
  label: string;
};

export const modules: ModuleDef[] = [
  { order: "01", slug: "dashboard", label: "Dashboard" },
  { order: "02", slug: "payables", label: "Payables" },
  { order: "03", slug: "receivables", label: "Receivables" },
  { order: "04", slug: "bank-statements", label: "Bank Statements" },
  { order: "05", slug: "projects", label: "Projects" },
  { order: "06", slug: "vendors", label: "Vendors" },
  { order: "07", slug: "clients", label: "Clients" },
  { order: "08", slug: "settings", label: "Settings" },
  { order: "09", slug: "reports", label: "Reports" },
  { order: "10", slug: "data", label: "Data" },
];
