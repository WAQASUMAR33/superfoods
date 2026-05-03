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
import PersonAddIcon from "@mui/icons-material/PersonAdd";

import { Header } from "@/components/layout/Header";
import { UrlSyncedFilters } from "@/components/mui/UrlSyncedFilters";
import { prisma } from "@/lib/prisma";
import { lastRunningBalancesByCustomerId } from "@/lib/partyBalances";
import { formatCurrency } from "@/lib/utils";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const city = params.city?.trim();

  const where = {
    isActive: true,
    ...(q
      ? {
          OR: [{ name: { contains: q } }, { code: { contains: q } }, { phone: { contains: q } }],
        }
      : {}),
    ...(city ? { city: { contains: city } } : {}),
  };

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { sales: true } } },
  });

  const balanceMap = await lastRunningBalancesByCustomerId(prisma, customers);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Customers" />
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
            <Typography variant="body2" color="text.secondary">
              {customers.length} customers
            </Typography>
            <Link href="/customers/new" prefetch style={{ textDecoration: "none" }}>
              <Button variant="contained" startIcon={<PersonAddIcon />}>
                Add Customer
              </Button>
            </Link>
          </Box>

          <Suspense fallback={<Box sx={{ height: 96, mb: 2 }} />}>
            <UrlSyncedFilters
              fields={[
                {
                  key: "q",
                  type: "text",
                  label: "Search",
                  placeholder: "Name, code…",
                },
                {
                  key: "city",
                  type: "text",
                  label: "City",
                  placeholder: "Contains…",
                },
              ]}
            />
          </Suspense>

          <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
            <Table size="small" sx={{ "& .MuiTableCell-root": { py: 1.5 } }}>
              <TableHead sx={{ "& th": { fontWeight: 600, bgcolor: "action.hover", color: "text.secondary", fontSize: 11 } }}>
                <TableRow>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Phone</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }} align="right">
                    Credit Limit
                  </TableCell>
                  <TableCell align="right">Balance Due</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }} align="center">
                    Sales
                  </TableCell>
                  <TableCell align="right" width={88} />
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((c) => {
                  const balance = balanceMap[c.id] ?? 0;
                  return (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, fontFamily: "monospace", fontSize: 12 }} color="text.secondary">
                        {c.code}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {c.name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }} color="text.secondary">
                        {c.phone ?? "—"}
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }} align="right">
                        {formatCurrency(c.creditLimit)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: balance > 0 ? "warning.main" : "success.main" }}
                      >
                          {formatCurrency(balance)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }} align="center">
                        <Chip label={c._count.sales} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Link href={`/customers/${c.id}`} prefetch style={{ textDecoration: "none" }}>
                          <Button size="small">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {customers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                        No customers match your filters.
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
