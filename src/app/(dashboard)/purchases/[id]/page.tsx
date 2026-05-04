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
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PersonIcon from "@mui/icons-material/Person";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";

import { Header } from "@/components/layout/Header";
import { PurchaseHistoryBackButton, SupplierProfileLink } from "@/components/purchases/PurchaseDetailNavClient";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";

const PURCHASE_STATUSES = ["PAID", "PARTIALLY_PAID", "RECEIVED", "CANCELLED"] as const;

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
      <Typography variant="body2" sx={{ fontWeight: 500, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
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

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const purchaseId = Number(id);
  if (Number.isNaN(purchaseId)) notFound();

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      supplier: true,
      user: true,
      items: { include: { product: { include: { brand: true } } }, orderBy: { id: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!purchase) notFound();

  const statusOk = PURCHASE_STATUSES.includes(purchase.status as (typeof PURCHASE_STATUSES)[number]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Purchase" />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 }, bgcolor: "grey.50" }}>
        <Container maxWidth="md">
          <Stack spacing={2.5}>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
              <PurchaseHistoryBackButton />
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
                      Internal ref
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
                      {purchase.internalRef}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                      Supplier invoice: <strong>{purchase.invoiceNo}</strong>
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 2, opacity: 0.92 }}>
                      <MetaLine icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 18 }} />}>
                        {formatDateTime(purchase.purchaseDate)}
                      </MetaLine>
                      <MetaLine icon={<PersonIcon sx={{ fontSize: 18 }} />}>
                        {purchase.user?.fullName ?? `User #${purchase.userId}`}
                      </MetaLine>
                    </Stack>
                  </Box>
                  <Chip
                    label={statusOk ? purchase.status.replace(/_/g, " ") : purchase.status}
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
                      Supplier
                    </Typography>
                    <Stack spacing={0.5}>
                      <SupplierProfileLink supplierId={purchase.supplier.id} name={purchase.supplier.name} />
                      <Typography variant="body2" color="text.secondary">
                        Code {purchase.supplier.code}
                        {purchase.supplier.phone ? ` · ${purchase.supplier.phone}` : ""}
                      </Typography>
                    </Stack>

                    {(purchase.moisturePercent != null ||
                      purchase.qualityGrade ||
                      purchase.qualityNotes ||
                      purchase.vehicleNo ||
                      purchase.driverName) && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                          Delivery &amp; quality
                        </Typography>
                        <Stack spacing={0.5}>
                          {purchase.moisturePercent != null ? (
                            <Typography variant="body2">
                              Moisture: <strong>{Number(purchase.moisturePercent).toFixed(2)}%</strong>
                            </Typography>
                          ) : null}
                          {purchase.qualityGrade ? (
                            <Typography variant="body2">
                              Grade: <strong>{purchase.qualityGrade}</strong>
                            </Typography>
                          ) : null}
                          {purchase.qualityNotes ? (
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                              {purchase.qualityNotes}
                            </Typography>
                          ) : null}
                          {purchase.vehicleNo || purchase.driverName ? (
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary", mt: 0.5 }}>
                              <LocalShippingOutlinedIcon sx={{ fontSize: 18 }} />
                              <Typography variant="body2">
                                {[purchase.vehicleNo, purchase.driverName].filter(Boolean).join(" · ") || "—"}
                              </Typography>
                            </Stack>
                          ) : null}
                        </Stack>
                      </Box>
                    )}
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                      Totals
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.paper" }}>
                      <DetailRow label="Subtotal">{formatCurrency(purchase.subtotal)}</DetailRow>
                      <DetailRow label="Discount">{formatCurrency(purchase.discount)}</DetailRow>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, py: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Total
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                          {formatCurrency(purchase.totalAmount)}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <DetailRow label="Paid">{formatCurrency(purchase.paidAmount)}</DetailRow>
                      <DetailRow label="Balance due">
                        <Box component="span" sx={{ color: Number(purchase.balanceDue) > 0 ? "error.main" : "success.main", fontWeight: 700 }}>
                          {formatCurrency(purchase.balanceDue)}
                        </Box>
                      </DetailRow>
                    </Paper>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
                    <ReceiptLongOutlinedIcon color="action" fontSize="small" />
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Line items ({purchase.items.length})
                    </Typography>
                  </Stack>

                  <Box sx={{ borderRadius: 1.5, border: 1, borderColor: "divider", overflow: "hidden" }}>
                    <TableContainer>
                      <Table size="small" sx={{ minWidth: 480 }}>
                        <TableHead>
                          <TableRow sx={{ bgcolor: "action.hover" }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", py: 1.25 }}>Product</TableCell>
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
                              Cost / kg
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", py: 1.25 }}>
                              Amount
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {purchase.items.map((line) => {
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
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block", fontFamily: "monospace" }}
                                  >
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
                                    display: { xs: "none", sm: "table-cell" },
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {formatCurrency(line.unitCostKg)}
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1.5, verticalAlign: "top", fontVariantNumeric: "tabular-nums" }}>
                                  {formatCurrency(line.totalCost)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Box>

                {purchase.payments.length > 0 ? (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                      Payments ({purchase.payments.length})
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "action.hover" }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>Method</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>
                              Amount
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", display: { xs: "none", sm: "table-cell" } }}>
                              Reference
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {purchase.payments.map((pay) => (
                            <TableRow key={pay.id}>
                              <TableCell>{formatDateTime(pay.paidAt)}</TableCell>
                              <TableCell>{pay.method.replace(/_/g, " ")}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>
                                {formatCurrency(pay.amount)}
                              </TableCell>
                              <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, color: "text.secondary", fontSize: 13 }}>
                                {pay.reference ?? "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ) : null}
              </Box>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
