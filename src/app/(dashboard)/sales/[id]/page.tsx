export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import PersonIcon from "@mui/icons-material/Person";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";

import { Header } from "@/components/layout/Header";
import { CustomerProfileLink, SaleHistoryBackButton } from "@/components/sales/SaleDetailNavClient";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";

const SALE_STATUSES = ["COMPLETED", "CREDIT", "PARTIALLY_PAID", "RETURNED"] as const;

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 2,
        py: 0.85,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
      >
        {children}
      </Typography>
    </Box>
  );
}

function MetaLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", color: "text.secondary" }}>
      <Box sx={{ mt: 0.15, color: "action.active", display: "flex" }}>{icon}</Box>
      <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
        {children}
      </Typography>
    </Stack>
  );
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
  const linesSubtotal = sale.items.reduce((sum, line) => sum + Number(line.totalAmount), 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Sale" />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 }, bgcolor: "grey.50" }}>
        <Container maxWidth="md">
          <Stack spacing={2.5}>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
              <SaleHistoryBackButton />
            </Box>

            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                border: 1,
                borderColor: "divider",
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
              }}
            >
              <Box
                sx={{
                  px: { xs: 2.5, sm: 3 },
                  py: { xs: 2.5, sm: 3 },
                  /** Static gradient — must not use `(theme) =>` here: MUI roots are client components and RSC cannot serialize function props. */
                  background: "linear-gradient(135deg, rgb(0, 107, 149) 0%, #0099D6 100%)",
                  color: "#fff",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1.2, fontWeight: 600 }}>
                      Invoice
                    </Typography>
                    <Typography
                      component="h1"
                      sx={{
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        fontWeight: 800,
                        fontSize: { xs: "1.5rem", sm: "1.75rem" },
                        lineHeight: 1.2,
                        mt: 0.5,
                        wordBreak: "break-all",
                      }}
                    >
                      {sale.invoiceNo}
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 2, opacity: 0.92 }}>
                      <MetaLine icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 18 }} />}>
                        {formatDateTime(sale.saleDate)}
                      </MetaLine>
                      <MetaLine icon={<PersonIcon sx={{ fontSize: 18 }} />}>
                        {sale.user?.fullName ?? `User #${sale.userId}`}
                      </MetaLine>
                      <MetaLine icon={<PaymentOutlinedIcon sx={{ fontSize: 18 }} />}>
                        {sale.paymentMethod}
                      </MetaLine>
                    </Stack>
                  </Box>
                  <Chip
                    label={statusOk ? sale.status.replace(/_/g, " ") : sale.status}
                    sx={{
                      color: "common.white",
                      borderColor: "rgba(255,255,255,0.5)",
                      fontWeight: 600,
                      bgcolor: "rgba(0,0,0,0.18)",
                    }}
                    variant="outlined"
                  />
                </Stack>
              </Box>

              <Box sx={{ px: { xs: 2.5, sm: 3 }, py: { xs: 2.5, sm: 3 } }}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                      Customer
                    </Typography>
                    {sale.customer ? (
                      <Stack spacing={0.5}>
                        <CustomerProfileLink customerId={sale.customer.id} name={sale.customer.name} />
                        <Typography variant="body2" color="text.secondary">
                          Code {sale.customer.code}
                          {sale.customer.phone ? ` · ${sale.customer.phone}` : ""}
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        Walk-in
                      </Typography>
                    )}
                    {sale.notes ? (
                      <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: "grey.100", border: 1, borderColor: "divider" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
                          Notes
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          {sale.notes}
                        </Typography>
                      </Box>
                    ) : null}
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                      Totals
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.paper" }}>
                      <DetailRow label="Subtotal">{formatCurrency(sale.subtotal)}</DetailRow>
                      <DetailRow label="Discount">{formatCurrency(sale.discountAmount)}</DetailRow>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, py: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Total
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                          {formatCurrency(sale.totalAmount)}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <DetailRow label="Paid">{formatCurrency(sale.paidAmount)}</DetailRow>
                      <DetailRow label="Credit">{formatCurrency(sale.creditAmount)}</DetailRow>
                      <DetailRow label="Change">{formatCurrency(sale.changeAmount)}</DetailRow>
                    </Paper>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
                    <ReceiptLongOutlinedIcon color="action" fontSize="small" />
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Line items ({sale.items.length})
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      borderRadius: 1.5,
                      border: 1,
                      borderColor: "divider",
                      maxWidth: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <TableContainer>
                    <Table size="small" sx={{ minWidth: 520 }}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: "action.hover" }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", py: 1.25 }}>
                            Product
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", py: 1.25 }}>
                            Qty
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 700,
                              fontSize: 11,
                              color: "text.secondary",
                              py: 1.25,
                              display: { xs: "none", sm: "table-cell" },
                            }}
                          >
                            / kg
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 700,
                              fontSize: 11,
                              color: "text.secondary",
                              py: 1.25,
                              display: { xs: "none", md: "table-cell" },
                            }}
                          >
                            Disc.
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", py: 1.25 }}>
                            Amount
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sale.items.map((line) => {
                          const brand = line.product.brand?.name;
                          const title = brand ? `${line.product.name} · ${brand}` : line.product.name;
                          return (
                            <TableRow
                              key={line.id}
                              hover
                              sx={{
                                "&:nth-of-type(even)": { bgcolor: "grey.50" },
                                "&:last-of-type td": { borderBottom: 0 },
                              }}
                            >
                              <TableCell sx={{ py: 1.5, verticalAlign: "top" }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontFamily: "monospace" }}>
                                  {line.product.code}
                                </Typography>
                              </TableCell>
                              <TableCell align="right" sx={{ py: 1.5, verticalAlign: "top", fontVariantNumeric: "tabular-nums" }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {formatNumber(line.displayQty, 3)} {line.displayUnit}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                  {formatNumber(line.quantityKg, 3)} kg
                                </Typography>
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  py: 1.5,
                                  verticalAlign: "top",
                                  fontVariantNumeric: "tabular-nums",
                                  display: { xs: "none", sm: "table-cell" },
                                }}
                              >
                                {formatCurrency(line.unitPriceKg)}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  py: 1.5,
                                  verticalAlign: "top",
                                  display: { xs: "none", md: "table-cell" },
                                }}
                              >
                                {formatNumber(line.discount, 2)}%
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ py: 1.5, verticalAlign: "top", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                              >
                                {formatCurrency(line.totalAmount)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {sale.items.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                              No line items on this sale.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {sale.items.length > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 2,
                        px: 2,
                        py: 1.5,
                        bgcolor: "action.selected",
                        borderTop: 1,
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Lines subtotal
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(linesSubtotal)}
                      </Typography>
                    </Box>
                  )}
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
