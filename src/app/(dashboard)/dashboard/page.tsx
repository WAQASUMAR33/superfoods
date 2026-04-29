export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InsightsIcon from "@mui/icons-material/Insights";

import { Header } from "@/components/layout/Header";
import { UrlSyncedFilters } from "@/components/mui/UrlSyncedFilters";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { getStockLevels } from "@/lib/inventory";
import { DashboardCharts } from "./DashboardCharts";

const SALE_STATUSES = ["COMPLETED", "CREDIT", "PARTIALLY_PAID", "RETURNED"] as const;

async function getDashboardData(recent?: { q?: string; status?: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const qRe = recent?.q?.trim();
  const saleStatus =
    recent?.status?.trim() && SALE_STATUSES.includes(recent.status as (typeof SALE_STATUSES)[number])
      ? recent.status
      : undefined;

  const recentWhere = {
    ...(saleStatus ? { status: saleStatus } : {}),
    ...(qRe
      ? {
          OR: [{ invoiceNo: { contains: qRe } }, { customer: { name: { contains: qRe } } }],
        }
      : {}),
  };

  const [salesToday, purchasesToday, products, lowStockProducts, recentSales] = await Promise.all([
    prisma.sale.aggregate({ where: { saleDate: { gte: today } }, _sum: { totalAmount: true }, _count: true }),
    prisma.purchase.aggregate({ where: { purchaseDate: { gte: today } }, _sum: { totalAmount: true }, _count: true }),
    prisma.product.findMany({ where: { isActive: true }, include: { brand: true } }),
    prisma.product.findMany({ where: { isActive: true } }),
    prisma.sale.findMany({
      take: 8,
      where: recentWhere,
      orderBy: { saleDate: "desc" },
      include: { customer: true, items: true },
    }),
  ]);

  const stockLevels = await getStockLevels(prisma);
  const lowStockCount = lowStockProducts.filter((p) => (stockLevels[p.id] ?? 0) <= Number(p.lowStockThresholdKg)).length;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const salesChart = await Promise.all(
    last7Days.map(async (day) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const res = await prisma.sale.aggregate({
        where: { saleDate: { gte: day, lt: next } },
        _sum: { totalAmount: true },
      });
      return {
        date: day.toLocaleDateString("en-PK", { weekday: "short", day: "numeric" }),
        sales: Number(res._sum.totalAmount ?? 0),
      };
    })
  );

  return {
    salesToday: { amount: Number(salesToday._sum.totalAmount ?? 0), count: salesToday._count },
    purchasesToday: { amount: Number(purchasesToday._sum.totalAmount ?? 0), count: purchasesToday._count },
    lowStockCount,
    totalProducts: products.length,
    recentSales,
    salesChart,
  };
}

const KPI_GRADS = [
  "linear-gradient(135deg,#3b82f6 0%,#2563eb 100%)",
  "linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)",
  "linear-gradient(135deg,#f43f5e 0%,#e11d48 100%)",
  "linear-gradient(135deg,#10b981 0%,#059669 100%)",
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ recentQ?: string; recentStatus?: string }>;
}) {
  const sp = await searchParams;
  const data = await getDashboardData({
    q: sp.recentQ,
    status: sp.recentStatus,
  });

  const kpis = [
    {
      label: "Sales Today",
      value: formatCurrency(data.salesToday.amount),
      sub: `${data.salesToday.count} transactions`,
      Icon: ShoppingCartIcon,
      grad: KPI_GRADS[0],
    },
    {
      label: "Purchases Today",
      value: formatCurrency(data.purchasesToday.amount),
      sub: `${data.purchasesToday.count} purchase orders`,
      Icon: LocalShippingIcon,
      grad: KPI_GRADS[1],
    },
    {
      label: "Low Stock Alerts",
      value: String(data.lowStockCount),
      sub: "products below threshold",
      Icon: WarningAmberIcon,
      grad: KPI_GRADS[2],
    },
    {
      label: "Total Products",
      value: String(data.totalProducts),
      sub: "active products",
      Icon: InsightsIcon,
      grad: KPI_GRADS[3],
    },
  ];

  const chipColor = (s: string) => {
    if (s === "COMPLETED") return "success" as const;
    if (s === "CREDIT") return "warning" as const;
    return "default" as const;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Dashboard" />

      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="xl" sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" },
              gap: 2,
            }}
          >
            {kpis.map((kpi) => {
              const Icon = kpi.Icon;
              return (
              <Card
                key={kpi.label}
                elevation={6}
                sx={{
                  color: "#fff",
                  background: kpi.grad,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ position: "absolute", right: -12, top: -12, width: 88, height: 88, bgcolor: "rgba(255,255,255,.1)" }} />
                <Box sx={{ p: 2.75, position: "relative" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box>
                      <Typography variant="caption" component="div" sx={{ opacity: 0.85, fontWeight: 600 }}>
                        {kpi.label}
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 1, fontWeight: 800 }}>
                        {kpi.value}
                      </Typography>
                      <Typography variant="caption" sx={{ mt: 0.5, display: "block", opacity: 0.72 }}>
                        {kpi.sub}
                      </Typography>
                    </Box>
                    <Box sx={{ bgcolor: "rgba(255,255,255,.2)", p: 1 }}>
                      <Icon sx={{ fontSize: 26 }} />
                    </Box>
                  </Box>
                </Box>
              </Card>
              );
            })}
          </Box>

          <DashboardCharts salesChart={data.salesChart} />

          <Paper sx={{ overflow: "hidden", boxShadow: 1 }}>
            <Box sx={{ px: 2, py: 1.75, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Recent Sales
              </Typography>
            </Box>

            <Suspense fallback={<Box sx={{ height: 72, px: 2, py: 2 }} />}>
              <Box sx={{ px: 2, pt: 2, pb: 0 }}>
                <UrlSyncedFilters
                  resetKeys={["recentQ", "recentStatus"]}
                  fields={[
                    {
                      key: "recentQ",
                      type: "text",
                      label: "Invoice / customer",
                      placeholder: "Search…",
                    },
                    {
                      key: "recentStatus",
                      type: "select",
                      label: "Status",
                      emptyLabel: "Any status",
                      options: SALE_STATUSES.map((s) => ({
                        value: s,
                        label: s.replace(/_/g, " "),
                      })),
                    },
                  ]}
                />
              </Box>
            </Suspense>

            {data.recentSales.length === 0 ? (
              <Box sx={{ py: 8, textAlign: "center", color: "text.secondary" }}>
                <ShoppingCartIcon sx={{ fontSize: 40, opacity: 0.35, mb: 1 }} />
                <Typography variant="body2">No matching recent sales.</Typography>
              </Box>
            ) : (
              <Box sx={{ overflowX: "auto", px: 0 }}>
                <Table size="small" sx={{ minWidth: 520 }}>
                  <TableHead sx={{ "& th": { fontWeight: 700, bgcolor: "action.hover", color: "text.secondary", fontSize: 11 } }}>
                    <TableRow>
                      <TableCell>Invoice</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Items</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentSales.map((sale) => (
                      <TableRow key={sale.id} hover>
                        <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }} color="primary">
                          {sale.invoiceNo}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {sale.customer?.name ?? (
                              <Box component="em" sx={{ color: "text.secondary" }}>
                                Walk-in
                              </Box>
                            )}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                          {sale.items.length}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatCurrency(sale.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={sale.status} color={chipColor(sale.status)} variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
