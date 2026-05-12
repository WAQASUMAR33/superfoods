export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import PaymentsIcon from "@mui/icons-material/Payments";

import { Header } from "@/components/layout/Header";
import { UrlSyncedFilters } from "@/components/mui/UrlSyncedFilters";
import { prisma } from "@/lib/prisma";
import { lastRunningBalancesByCustomerId } from "@/lib/partyBalances";
import { formatCurrency } from "@/lib/utils";

export default async function CustomerReceivingListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();

  const where = {
    isActive: true,
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { code: { contains: q } },
            { phone: { contains: q } },
            { businessName: { contains: q } },
          ],
        }
      : {}),
  };

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      businessName: true,
      phone: true,
      openingBalance: true,
    },
  });

  const balanceMap = await lastRunningBalancesByCustomerId(prisma, customers);

  const allCustomers = customers
    .map((c) => ({ ...c, balance: balanceMap[c.id] ?? 0 }))
    .sort((a, b) => b.balance - a.balance);

  const totalReceivable = allCustomers.reduce((sum, c) => sum + Math.max(0, c.balance), 0);
  const withBalanceCount = allCustomers.filter((c) => c.balance > 0.005).length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Customer Receiving" />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="xl">
          <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {withBalanceCount} customers with outstanding balance · {allCustomers.length} total
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Total Receivable: {formatCurrency(totalReceivable)}
              </Typography>
            </Box>
          </Box>

          <Suspense fallback={<Box sx={{ height: 96, mb: 2 }} />}>
            <UrlSyncedFilters
              fields={[
                {
                  key: "q",
                  type: "text",
                  label: "Search",
                  placeholder: "Name, code, phone…",
                },
              ]}
            />
          </Suspense>

          <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
            <Table size="small" sx={{ "& .MuiTableCell-root": { py: 1.5 } }}>
              <TableHead sx={{ "& th": { fontWeight: 600, bgcolor: "action.hover", color: "text.secondary", fontSize: 11 } }}>
                <TableRow>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Code</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Business</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Phone</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell align="right" width={120} />
                </TableRow>
              </TableHead>
              <TableBody>
                {allCustomers.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, fontFamily: "monospace", fontSize: 12 }}>
                      {c.code}
                    </TableCell>
                    <TableCell>
                      <Link href={`/customers/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {c.name}
                        </Typography>
                      </Link>
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                      {c.businessName ?? "—"}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      {c.phone ?? "—"}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: c.balance > 0.005 ? "warning.main" : "success.main" }}
                      >
                        {formatCurrency(c.balance)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Link href={`/customers/${c.id}/receiving`} prefetch style={{ textDecoration: "none" }}>
                        <Button size="small" variant="contained" color="success" startIcon={<PaymentsIcon />}>
                          Receive
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {allCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                        {q ? "No customers match your search." : "No customers found."}
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
