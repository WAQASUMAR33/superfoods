export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
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
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";

const SALE_STATUSES = ["COMPLETED", "CREDIT", "PARTIALLY_PAID", "RETURNED"] as const;

function statusColor(s: string) {
  if (s === "COMPLETED") return "success" as const;
  if (s === "CREDIT") return "warning" as const;
  if (s === "RETURNED") return "error" as const;
  return "default" as const;
}

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const saleId = Number(id);
  if (Number.isNaN(saleId)) notFound();

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      customer: true,
      user: true,
      items: { include: { product: { include: { brand: true } } }, orderBy: { id: "asc" } },
    },
  });
  if (!sale) notFound();

  const statusOk = SALE_STATUSES.includes(sale.status as (typeof SALE_STATUSES)[number]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title={`Sale ${sale.invoiceNo}`} />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
            <Link href="/sales" style={{ textDecoration: "none" }}>
              <Button startIcon={<ArrowBackIcon />} size="small">
                Back to Sales
              </Button>
            </Link>
            <Chip
              size="small"
              label={statusOk ? sale.status.replace(/_/g, " ") : sale.status}
              color={statusColor(sale.status)}
              variant="outlined"
            />
          </Box>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1.5 }}>
                    Invoice
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                    {sale.invoiceNo}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Date: {formatDateTime(sale.saleDate)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cashier: {sale.user?.fullName ?? `#${sale.userId}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Payment: {sale.paymentMethod}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Customer:{" "}
                    {sale.customer ? (
                      <Link href={`/customers/${sale.customer.id}`} style={{ fontWeight: 600 }}>
                        {sale.customer.name}
                      </Link>
                    ) : (
                      "Walk-in"
                    )}
                  </Typography>
                  {sale.notes ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Notes: {sale.notes}
                    </Typography>
                  ) : null}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1.5 }}>
                    Amounts
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal: {formatCurrency(sale.subtotal)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Discount: {formatCurrency(sale.discountAmount)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700 }}>
                    Total: {formatCurrency(sale.totalAmount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Paid: {formatCurrency(sale.paidAmount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Credit: {formatCurrency(sale.creditAmount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Change: {formatCurrency(sale.changeAmount)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                Line items
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ "& th": { fontWeight: 600, bgcolor: "action.hover", color: "text.secondary", fontSize: 11 } }}>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Unit price / kg</TableCell>
                      <TableCell align="right">Discount %</TableCell>
                      <TableCell align="right">Line total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sale.items.map((line) => {
                      const brand = line.product.brand?.name;
                      const title = brand ? `${line.product.name} (${brand})` : line.product.name;
                      return (
                        <TableRow key={line.id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {line.product.variety}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {formatNumber(line.displayQty, 3)} {line.displayUnit}
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              {formatNumber(line.quantityKg, 3)} kg
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{formatCurrency(line.unitPriceKg)}</TableCell>
                          <TableCell align="right">{formatNumber(line.discount, 2)}%</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {formatCurrency(line.totalAmount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {sale.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
                          No line items.
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
