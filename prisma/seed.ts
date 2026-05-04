import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BRAND_DISPLAY_NAME, DEFAULT_BUSINESS_CONTACT } from "../src/config/branding";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Admin user
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", fullName: "Administrator", email: "admin@ricepos.com", passwordHash, role: "ADMIN" },
  });

  console.log("✓ Admin user created (username: admin, password: admin123)");

  // Business settings
  await prisma.businessSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      businessName: BRAND_DISPLAY_NAME,
      address: DEFAULT_BUSINESS_CONTACT.address,
      phone: DEFAULT_BUSINESS_CONTACT.phone,
      ntnNumber: DEFAULT_BUSINESS_CONTACT.ntnNumber,
      currency: "EUR",
      invoicePrefix: "INV",
      purchasePrefix: "PUR",
      lowStockDefaultKg: 200,
    },
  });

  // Brands
  const brands = ["Punjab Basmati", "Pak Sella", "Star Rice", "Golden Grain", "No Brand"];
  const createdBrands: Record<string, number> = {};
  for (const name of brands) {
    const b = await prisma.brand.upsert({ where: { name }, update: {}, create: { name } });
    createdBrands[name] = b.id;
  }
  console.log("✓ Brands seeded");

  // Products
  const products = [
    { code: "BSM-1121-EL", name: "Basmati 1121 Extra Long", brand: "Punjab Basmati", salePrice: 280, purchasePrice: 240 },
    { code: "BSM-386-L", name: "Basmati PK-386 Long", brand: "Punjab Basmati", salePrice: 220, purchasePrice: 190 },
    { code: "BSM-SK-L", name: "Super Kernel Basmati", brand: "Golden Grain", salePrice: 260, purchasePrice: 225 },
    { code: "SLL-PSTA-M", name: "Sella Parboiled Medium", brand: "Pak Sella", salePrice: 160, purchasePrice: 140 },
    { code: "SLL-1121-EL", name: "Sella 1121 Extra Long", brand: "Pak Sella", salePrice: 200, purchasePrice: 175 },
    { code: "IRRI6-M", name: "IRRI-6 Medium Grain", brand: "Star Rice", salePrice: 110, purchasePrice: 95 },
    { code: "IRRI9-M", name: "IRRI-9 Medium Grain", brand: "No Brand", salePrice: 120, purchasePrice: 105 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: {
        code: p.code,
        name: p.name,
        brandId: createdBrands[p.brand], defaultUnit: "KG",
        salePrice: p.salePrice, purchasePrice: p.purchasePrice,
        lowStockThresholdKg: 200,
      },
    });
  }
  console.log("✓ Products seeded");

  // Chart of Accounts
  const accounts = [
    { code: "1000", name: "Current Assets", type: "ASSET", isSystem: false },
    { code: "1001", name: "Cash in Hand", type: "ASSET", isSystem: true },
    { code: "1002", name: "Cash at Bank", type: "ASSET", isSystem: true },
    { code: "1100", name: "Accounts Receivable", type: "ASSET", isSystem: true },
    { code: "1200", name: "Rice Stock Inventory", type: "ASSET", isSystem: true },
    { code: "2000", name: "Liabilities", type: "LIABILITY", isSystem: false },
    { code: "2001", name: "Accounts Payable (Suppliers)", type: "LIABILITY", isSystem: true },
    { code: "3000", name: "Equity", type: "EQUITY", isSystem: false },
    { code: "3001", name: "Owner Capital", type: "EQUITY", isSystem: true },
    { code: "4000", name: "Income", type: "INCOME", isSystem: false },
    { code: "4001", name: "Sales Revenue - Rice", type: "INCOME", isSystem: true },
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", isSystem: false },
    { code: "5001", name: "Purchase Cost - Rice", type: "EXPENSE", isSystem: true },
    { code: "6000", name: "Operating Expenses", type: "EXPENSE", isSystem: false },
    { code: "6001", name: "Labour Expense", type: "EXPENSE", isSystem: true },
    { code: "6002", name: "Transport Expense", type: "EXPENSE", isSystem: true },
    { code: "6003", name: "Electricity Expense", type: "EXPENSE", isSystem: true },
    { code: "6004", name: "Rent Expense", type: "EXPENSE", isSystem: true },
    { code: "6099", name: "Miscellaneous Expense", type: "EXPENSE", isSystem: true },
  ];

  for (const a of accounts) {
    await prisma.account.upsert({
      where: { code: a.code },
      update: {},
      create: a,
    });
  }
  console.log("✓ Chart of accounts seeded");

  // Expense categories
  const expenseCategories = [
    { name: "Labour", accountId: await getAccountId("6001") },
    { name: "Transport (Bardana)", accountId: await getAccountId("6002") },
    { name: "Electricity", accountId: await getAccountId("6003") },
    { name: "Rent", accountId: await getAccountId("6004") },
    { name: "Miscellaneous", accountId: await getAccountId("6099") },
  ];

  for (const c of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }
  console.log("✓ Expense categories seeded");

  // Sample suppliers
  const suppliers = [
    { code: "SUP-001", name: "Khan Rice Mills", phone: "0300-1234567", city: "Gujranwala", creditTermDays: 30 },
    { code: "SUP-002", name: "Punjab Grain Traders", phone: "0321-9876543", city: "Lahore", creditTermDays: 15 },
    { code: "SUP-003", name: "Ahmed & Sons", phone: "0333-5556666", city: "Sheikhupura", creditTermDays: 0 },
  ];

  for (const s of suppliers) {
    await prisma.supplier.upsert({ where: { code: s.code }, update: {}, create: s });
  }
  console.log("✓ Sample suppliers seeded");

  // Sample customers
  const customers = [
    { code: "CUS-001", name: "Al Madina Grocery", phone: "0300-1111222", city: "Lahore", creditLimit: 500000 },
    { code: "CUS-002", name: "City Superstore", phone: "0321-3334455", city: "Faisalabad", creditLimit: 1000000 },
    { code: "CUS-003", name: "Rehman Traders", phone: "0333-7778899", city: "Multan", creditLimit: 200000 },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  console.log("✓ Sample customers seeded");

  console.log("\nSeed complete! Login: admin / admin123");
}

async function getAccountId(code: string): Promise<number> {
  const account = await prisma.account.findUnique({ where: { code } });
  return account?.id ?? 1;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
