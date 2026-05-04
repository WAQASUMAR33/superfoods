export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PaymentIcon from "@mui/icons-material/Payment";

import { Header } from "@/components/layout/Header";
import { SupplierLedgerPanel } from "@/components/suppliers/SupplierLedgerPanel";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplierId = Number(id);
  if (Number.isNaN(supplierId)) notFound();

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      purchases: { orderBy: { purchaseDate: "desc" }, take: 20 },
      ledgerEntries: { orderBy: { entryDate: "desc" }, take: 1 },
    },
  });
  if (!supplier) notFound();

  const latestLedger = supplier.ledgerEntries[0];
  const balanceDue = Number(latestLedger?.runningBalance ?? supplier.openingBalance);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title={`Supplier: ${supplier.name}`} />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="xl">
          <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
            <Link href="/suppliers" style={{ textDecoration: "none", display: "inline-flex" }}>
              <Button component="span" startIcon={<ArrowBackIcon />} size="small">
                Back to Suppliers
              </Button>
            </Link>
            <Link href={`/suppliers/${supplier.id}/payment`} style={{ textDecoration: "none", display: "inline-flex" }}>
              <Button component="span" startIcon={<PaymentIcon />} size="small" variant="contained">
                Record payment
              </Button>
            </Link>
          </Box>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1.5 }}>
                    Profile
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Code: {supplier.code}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Phone: {supplier.phone ?? "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    City: {supplier.city ?? "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Address: {supplier.address ?? "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Notes: {supplier.notes ?? "—"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1.5 }}>
                    Financial
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Credit terms: {supplier.creditTermDays} day{supplier.creditTermDays === 1 ? "" : "s"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Credit limit: {formatCurrency(supplier.creditLimit)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Opening balance: {formatCurrency(supplier.openingBalance)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700 }}>
                    Current balance (payable): {formatCurrency(balanceDue)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                Recent purchases
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Invoice</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Paid</TableCell>
                      <TableCell align="right">Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {supplier.purchases.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.purchaseDate)}</TableCell>
                        <TableCell>{p.invoiceNo}</TableCell>
                        <TableCell align="right">{formatCurrency(p.totalAmount)}</TableCell>
                        <TableCell align="right">{formatCurrency(p.paidAmount)}</TableCell>
                        <TableCell align="right">{formatCurrency(p.balanceDue)}</TableCell>
                      </TableRow>
                    ))}
                    {supplier.purchases.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
                          No purchases yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          <SupplierLedgerPanel
            supplierId={supplier.id}
            supplierName={supplier.name}
            supplierCode={supplier.code}
            openingBalance={Number(supplier.openingBalance)}
          />
        </Container>
      </Box>
    </Box>
  );
}
