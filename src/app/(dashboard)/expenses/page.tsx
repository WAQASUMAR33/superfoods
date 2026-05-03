export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";

import { ExpenseActions } from "@/components/expenses/ExpenseActions";
import { Header } from "@/components/layout/Header";
import { UrlSyncedFilters } from "@/components/mui/UrlSyncedFilters";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoryId?: string; paymentMethod?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const canManage = isAdmin((session?.user as { role?: string })?.role);
  const params = await searchParams;
  const q = params.q?.trim();
  const categoryId = params.categoryId ? Number(params.categoryId) : undefined;
  const paymentMethod = params.paymentMethod?.trim();

  const categories = await prisma.expenseCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const paymentMethods = await prisma.expense.findMany({
    select: { paymentMethod: true },
    distinct: ["paymentMethod"],
  });

  const expenses = await prisma.expense.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { description: { contains: q } },
              { category: { name: { contains: q } } },
            ],
          }
        : {}),
      ...(categoryId && !Number.isNaN(categoryId) ? { categoryId } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
    },
    orderBy: { expenseDate: "desc" },
    take: 100,
    include: { category: true },
  });

  const totalThisMonth = await prisma.expense.aggregate({
    where: { expenseDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
    _sum: { amount: true },
  });

  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));
  const paymentOptions = paymentMethods
    .map((p) => p.paymentMethod)
    .filter(Boolean)
    .sort()
    .map((m) => ({ value: m, label: m }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Expenses" />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="xl">
          <Box
            sx={{
              mb: 2,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                {expenses.length} records
              </Typography>
              <Typography variant="caption" color="text.disabled">
                This month:{" "}
                <Typography component="span" variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
                  {formatCurrency(totalThisMonth._sum.amount ?? 0)}
                </Typography>
              </Typography>
            </Box>
            <Link href="/expenses/new" prefetch style={{ textDecoration: "none" }}>
              <Button variant="contained" startIcon={<AddIcon />}>
                Log Expense
              </Button>
            </Link>
          </Box>

          <Suspense fallback={<Box sx={{ height: 96, mb: 2 }} />}>
            <UrlSyncedFilters
              fields={[
                { key: "q", type: "text", label: "Search", placeholder: "Description or category" },
                {
                  key: "categoryId",
                  type: "select",
                  label: "Category",
                  emptyLabel: "All categories",
                  options: categoryOptions,
                },
                {
                  key: "paymentMethod",
                  type: "select",
                  label: "Payment",
                  emptyLabel: "All methods",
                  options: paymentOptions,
                },
              ]}
            />
          </Suspense>

          <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
            <Table size="small" sx={{ "& .MuiTableCell-root": { py: 1.5 } }}>
              <TableHead sx={{ "& th": { fontWeight: 600, bgcolor: "action.hover", color: "text.secondary", fontSize: 11 } }}>
                <TableRow>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Date</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Method</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  {canManage && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }} color="text.secondary">
                      {formatDate(e.expenseDate)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {e.category.name}
                      </Typography>
                    </TableCell>
                    <TableCell color="text.secondary">{e.description ?? "—"}</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }} color="text.secondary">
                      {e.paymentMethod}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "error.main", fontWeight: 600 }}>
                      {formatCurrency(e.amount)}
                    </TableCell>
                    {canManage && (
                      <TableCell align="right">
                        <ExpenseActions
                          expense={{
                            id: e.id,
                            categoryId: e.categoryId,
                            amount: Number(e.amount),
                            description: e.description,
                            expenseDate: e.expenseDate,
                            paymentMethod: e.paymentMethod,
                            reference: e.reference,
                          }}
                          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canManage ? 6 : 5}>
                      <Typography sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                        No expenses match your filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>
    </Box>
  );
}
