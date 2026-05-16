/** Titles for the mobile shell header (`lg:hidden`). Order matters: more specific patterns first. */
export function dashboardTitleFromPathname(pathname: string): string {
  const p = (pathname.split("?")[0] || "/").replace(/\/+$/, "") || "/";

  const rules: [RegExp, string][] = [
    [/^\/dashboard$/, "Dashboard"],
    [/^\/pos$/, "POS"],
    [/^\/products\/brands$/, "Brand management"],
    [/^\/products\/new$/, "Add product"],
    [/^\/products\/\d+$/, "Edit product"],
    [/^\/products$/, "Products"],
    [/^\/stock$/, "Stock levels"],
    [/^\/purchases\/returns$/, "Purchase returns"],
    [/^\/purchases\/new$/, "New purchase"],
    [/^\/purchases\/\d+\/return$/, "Purchase return"],
    [/^\/purchases\/\d+$/, "Purchase"],
    [/^\/purchases$/, "Purchases"],
    [/^\/suppliers\/new$/, "Add supplier"],
    [/^\/suppliers\/\d+\/payment$/, "Pay supplier"],
    [/^\/suppliers\/\d+\/edit$/, "Edit supplier"],
    [/^\/suppliers\/\d+$/, "Supplier"],
    [/^\/suppliers$/, "Suppliers"],
    [/^\/sales\/returns$/, "Sale returns"],
    [/^\/sales\/\d+\/return$/, "Sale return"],
    [/^\/sales\/\d+\/edit$/, "Edit sale"],
    [/^\/sales\/\d+$/, "Sale"],
    [/^\/sales$/, "Sales history"],
    [/^\/customers\/receiving$/, "Customer receiving"],
    [/^\/customers\/new$/, "Add customer"],
    [/^\/customers\/\d+\/receiving$/, "Receive payment"],
    [/^\/customers\/\d+\/edit$/, "Edit customer"],
    [/^\/customers\/\d+$/, "Customer"],
    [/^\/customers$/, "Customers"],
    [/^\/accounts\/new$/, "Add account"],
    [/^\/accounts$/, "Chart of accounts"],
    [/^\/expenses\/categories$/, "Expense categories"],
    [/^\/expenses\/new$/, "Log expense"],
    [/^\/expenses$/, "Expenses"],
    [/^\/reports\/profit-loss$/, "Profit & loss"],
    [/^\/reports\/sales$/, "Sales report"],
    [/^\/reports\/purchases$/, "Purchase report"],
    [/^\/reports\/stock$/, "Stock valuation"],
    [/^\/reports\/ledger$/, "Ledger report"],
    [/^\/reports$/, "Reports"],
    [/^\/settings$/, "Settings"],
    [/^\/users$/, "Users"],
  ];

  for (const [re, title] of rules) {
    if (re.test(p)) return title;
  }

  return "Dashboard";
}
