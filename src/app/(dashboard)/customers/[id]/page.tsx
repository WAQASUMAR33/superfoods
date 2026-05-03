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

import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = Number(id);
  if (Number.isNaN(customerId)) notFound();

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      sales: { orderBy: { saleDate: "desc" }, take: 20 },
      ledgerEntries: { orderBy: { entryDate: "desc" }, take: 50 },
    },
  });
  if (!customer) notFound();

  const latestLedger = customer.ledgerEntries[0];
  const balanceDue = Number(latestLedger?.runningBalance ?? customer.openingBalance);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title={`Customer: ${customer.name}`} />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="xl">
          <Box sx={{ mb: 2 }}>
            <Link href="/customers" style={{ textDecoration: "none" }}>
              <Button startIcon={<ArrowBackIcon />} size="small">
                Back to Customers
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
                    Code: {customer.code}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Phone: {customer.phone ?? "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    City: {customer.city ?? "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Address: {customer.address ?? "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Notes: {customer.notes ?? "—"}
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
                    Credit Limit: {formatCurrency(customer.creditLimit)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Opening Balance: {formatCurrency(customer.openingBalance)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700 }}>
                    Current Balance Due: {formatCurrency(balanceDue)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                Recent Sales
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Invoice</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Paid</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customer.sales.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{formatDate(s.saleDate)}</TableCell>
                        <TableCell>{s.invoiceNo}</TableCell>
                        <TableCell align="right">{formatCurrency(s.totalAmount)}</TableCell>
                        <TableCell align="right">{formatCurrency(s.paidAmount)}</TableCell>
                      </TableRow>
                    ))}
                    {customer.sales.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
                          No sales yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                Ledger Entries
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="right">Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customer.ledgerEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDate(entry.entryDate)}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell align="right">{formatCurrency(entry.amount)}</TableCell>
                        <TableCell align="right">{formatCurrency(entry.runningBalance)}</TableCell>
                      </TableRow>
                    ))}
                    {customer.ledgerEntries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
                          No ledger entries yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </Box>
  );
}
