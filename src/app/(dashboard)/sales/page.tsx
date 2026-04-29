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
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";

import { Header } from "@/components/layout/Header";
import { UrlSyncedFilters } from "@/components/mui/UrlSyncedFilters";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const SALE_STATUSES = ["COMPLETED", "CREDIT", "PARTIALLY_PAID", "RETURNED"] as const;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const status = params.status?.trim();

  const where = {
    ...(q
      ? {
          OR: [
            { invoiceNo: { contains: q } },
            { customer: { name: { contains: q } } },
          ],
        }
      : {}),
    ...(status && SALE_STATUSES.includes(status as (typeof SALE_STATUSES)[number]) ? { status } : {}),
  };

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { saleDate: "desc" },
    take: 100,
    include: { customer: true, user: true, _count: { select: { items: true } } },
  });

  const statusColor = (s: string) => {
    if (s === "COMPLETED") return "success" as const;
    if (s === "CREDIT") return "warning" as const;
    if (s === "RETURNED") return "error" as const;
    return "default" as const;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Sales History" />
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
              {sales.length} sales
            </Typography>
          <Link href="/pos" prefetch style={{ textDecoration: "none" }}>
            <Button variant="contained" color="success" startIcon={<PointOfSaleIcon />}>
              New Sale (POS)
            </Button>
          </Link>
          </Box>

          <Suspense fallback={<Box sx={{ height: 96, mb: 2 }} />}>
            <UrlSyncedFilters
              fields={[
                { key: "q", type: "text", label: "Search", placeholder: "Invoice or customer" },
                {
                  key: "status",
                  type: "select",
                  label: "Status",
                  emptyLabel: "All statuses",
                  options: SALE_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })),
                },
              ]}
            />
          </Suspense>

          <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
            <Table size="small" sx={{ "& .MuiTableCell-root": { py: 1.5 } }}>
              <TableHead sx={{ "& th": { fontWeight: 600, bgcolor: "action.hover", color: "text.secondary", fontSize: 11 } }}>
                <TableRow>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Date &amp; time</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }} align="center">
                    Items
                  </TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }} align="right">
                    Paid
                  </TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" width={80} />
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }} color="primary">
                      {s.invoiceNo}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {s.customer?.name ?? "Walk-in"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, fontSize: 12 }} color="text.secondary">
                      {formatDateTime(s.saleDate)}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }} align="center">
                      {s._count.items}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(s.totalAmount)}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }} align="right" color="text.secondary">
                      {formatCurrency(s.paidAmount)}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={s.status} color={statusColor(s.status)} variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Link href={`/sales/${s.id}`} prefetch style={{ textDecoration: "none" }}>
                        <Button size="small">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                        No sales match your filters.
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
