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
import AddIcon from "@mui/icons-material/Add";

import { Header } from "@/components/layout/Header";
import { UrlSyncedFilters } from "@/components/mui/UrlSyncedFilters";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

const PURCHASE_STATUSES = ["PAID", "PARTIALLY_PAID", "RECEIVED", "CANCELLED"] as const;

export default async function PurchasesPage({
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
            { internalRef: { contains: q } },
            { invoiceNo: { contains: q } },
            { supplier: { name: { contains: q } } },
          ],
        }
      : {}),
    ...(status && PURCHASE_STATUSES.includes(status as (typeof PURCHASE_STATUSES)[number]) ? { status } : {}),
  };

  const purchases = await prisma.purchase.findMany({
    where,
    orderBy: { purchaseDate: "desc" },
    take: 100,
    include: { supplier: true, user: true },
  });

  const statusColor = (s: string) => {
    if (s === "PAID") return "success" as const;
    if (s === "PARTIALLY_PAID") return "warning" as const;
    if (s === "CANCELLED") return "error" as const;
    return "default" as const;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Purchases" />
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
              {purchases.length} records
            </Typography>
            <Link href="/purchases/new" prefetch style={{ textDecoration: "none" }}>
              <Button variant="contained" startIcon={<AddIcon />}>
                New Purchase
              </Button>
            </Link>
          </Box>

          <Suspense fallback={<Box sx={{ height: 96, mb: 2 }} />}>
            <UrlSyncedFilters
              fields={[
                { key: "q", type: "text", label: "Search", placeholder: "Ref, invoice, supplier" },
                {
                  key: "status",
                  type: "select",
                  label: "Status",
                  emptyLabel: "All statuses",
                  options: PURCHASE_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })),
                },
              ]}
            />
          </Suspense>

          <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
            <Table size="small" sx={{ "& .MuiTableCell-root": { py: 1.5 } }}>
              <TableHead sx={{ "& th": { fontWeight: 600, bgcolor: "action.hover", color: "text.secondary", fontSize: 11 } }}>
                <TableRow>
                  <TableCell>Ref</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Supplier invoice</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Date</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }} align="right">
                    Balance
                  </TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" width={80} />
                </TableRow>
              </TableHead>
              <TableBody>
                {purchases.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }} color="primary">
                      {p.internalRef}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, fontSize: 12 }} color="text.secondary">
                      {p.invoiceNo}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {p.supplier.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }} color="text.secondary">
                      {formatDate(p.purchaseDate)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(p.totalAmount)}
                    </TableCell>
                    <TableCell
                      sx={{
                        display: { xs: "none", sm: "table-cell" },
                        align: "right",
                        fontWeight: 600,
                        color: Number(p.balanceDue) > 0 ? "error.main" : "success.main",
                      }}
                    >
                      {formatCurrency(p.balanceDue)}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={p.status.replace(/_/g, " ")} color={statusColor(p.status)} variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Link href={`/purchases/${p.id}`} prefetch style={{ textDecoration: "none" }}>
                        <Button size="small">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {purchases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                        No purchases match your filters.
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
