"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, startOfMonth } from "date-fns";
import { useReactToPrint } from "react-to-print";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";

import type { LedgerBusinessInfo } from "@/components/customers/CustomerLedgerPanel";
import { BRAND_DISPLAY_NAME, BRAND_LOGO_SRC, DEFAULT_BUSINESS_CONTACT } from "@/config/branding";
import { partyLedgerDebitCreditAmounts, partyLedgerPreBalance } from "@/lib/partyLedgerDisplay";
import { formatCurrency, formatDate } from "@/lib/utils";

type LedgerEntry = {
  id: number;
  entryDate: string;
  description: string;
  type: string;
  amount: number;
  runningBalance: number;
};

type ApiResponse = {
  supplier: { id: number; name: string; code: string; openingBalance: number };
  business: LedgerBusinessInfo;
  range: { from: string; to: string };
  entries: LedgerEntry[];
};

function toYmd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function fallbackBusiness(): LedgerBusinessInfo {
  return {
    businessName: BRAND_DISPLAY_NAME,
    address: DEFAULT_BUSINESS_CONTACT.address,
    phone: DEFAULT_BUSINESS_CONTACT.phone,
    ntnNumber: DEFAULT_BUSINESS_CONTACT.ntnNumber,
  };
}

async function loadLogoForPdf(logoPath: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(logoPath, window.location.origin).href;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const w = bmp.width;
    const h = bmp.height;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      return null;
    }
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    return { dataUrl: canvas.toDataURL("image/png"), w, h };
  } catch {
    return null;
  }
}

async function downloadLedgerPdf(
  party: { name: string; code: string },
  business: LedgerBusinessInfo,
  openingBalance: number,
  fromYmd: string,
  toYmd: string,
  entries: LedgerEntry[]
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const brandBlue: [number, number, number] = [0, 153, 214];
  const brandDark: [number, number, number] = [0, 107, 149];

  const logo = await loadLogoForPdf(BRAND_LOGO_SRC);
  let logoReserveMm = 0;
  if (logo) {
    const logoH = 14;
    const logoW = (logo.w / logo.h) * logoH;
    logoReserveMm = logoW + 5;
    doc.addImage(logo.dataUrl, "PNG", pageW - margin - logoW, 3, logoW, logoH);
  }

  doc.setFillColor(...brandDark);
  doc.rect(0, 0, pageW, 8, "F");
  doc.setFillColor(...brandBlue);
  doc.rect(0, 8, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("ACCOUNT LEDGER", margin, 6);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  const titleMaxW = pageW - margin * 2 - logoReserveMm;
  const titleLines = doc.splitTextToSize(business.businessName, Math.max(40, titleMaxW));
  doc.text(titleLines, margin, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Supplier party ledger — date range statement", margin, 22 + (titleLines.length - 1) * 4);

  let y = 32 + (titleLines.length - 1) * 4;
  doc.setTextColor(45, 55, 72);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Supplier: ${party.name}`, margin, y);
  doc.setFont("helvetica", "normal");
  y += 5;
  doc.setFontSize(9);
  doc.text(`Code: ${party.code}`, margin, y);
  y += 4.5;
  doc.text(`Statement period: ${fromYmd}  →  ${toYmd}`, margin, y);
  y += 4.5;
  doc.text(`Opening balance (reference): ${formatCurrency(openingBalance)}`, margin, y);
  y += 4.5;
  doc.text(`Lines in period: ${entries.length}`, margin, y);
  y += 6;

  if (business.address) {
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    const addrLines = doc.splitTextToSize(business.address.replace(/\n/g, " "), pageW - margin * 2);
    doc.text(addrLines, margin, y);
    y += addrLines.length * 3.2 + 2;
  }

  const body = entries.map((e) => {
    const pre = partyLedgerPreBalance(e.type, e.amount, e.runningBalance);
    const { debit, credit } = partyLedgerDebitCreditAmounts(e.type, e.amount);
    return [
      formatDate(e.entryDate),
      e.description.replace(/\s+/g, " ").slice(0, 72),
      formatCurrency(pre),
      debit > 0 ? formatCurrency(debit) : "—",
      credit > 0 ? formatCurrency(credit) : "—",
      formatCurrency(e.runningBalance),
    ];
  });

  const footerNote = "Computer-generated statement. Signature not required.";
  const genLine = `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`;

  autoTable(doc, {
    startY: y,
    head: [["Date", "Description", "Pre bal.", "Debit", "Credit", "Balance"]],
    body: body.length ? body : [["—", "No entries in this period", "", "", "", ""]],
    theme: "striped",
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: [220, 228, 235], lineWidth: 0.15 },
    headStyles: { fillColor: brandDark, textColor: 255, fontStyle: "bold", halign: "center" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 22, halign: "left" },
      1: { cellWidth: 52 },
      2: { halign: "right", cellWidth: 24 },
      3: { halign: "right", cellWidth: 22 },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "right", cellWidth: 24 },
    },
    margin: { left: margin, right: margin, bottom: 22 },
    showHead: "everyPage",
    didDrawPage: (data) => {
      const d = data.doc as import("jspdf").jsPDF;
      const ph = d.internal.pageSize.getHeight();
      const pw = d.internal.pageSize.getWidth();
      d.setDrawColor(200, 210, 220);
      d.setLineWidth(0.3);
      d.line(margin, ph - 16, pw - margin, ph - 16);
      d.setFontSize(7);
      d.setTextColor(90, 100, 110);
      d.setFont("helvetica", "normal");
      d.text(business.businessName, pw / 2, ph - 12, { align: "center" });
      let fy = ph - 9;
      if (business.phone) {
        d.text(business.phone, pw / 2, fy, { align: "center" });
        fy += 3;
      }
      d.text(footerNote, pw / 2, fy, { align: "center" });
      fy += 3;
      d.text(`${genLine}  ·  Page ${data.pageNumber}`, pw - margin, ph - 4, { align: "right" });
      if (business.ntnNumber) {
        d.text(business.ntnNumber, margin, ph - 4, { align: "left", maxWidth: pw - margin * 2 - 50 });
      }
    },
  });

  const safe = `${party.code}-ledger-${fromYmd}-${toYmd}`.replace(/[\\/:*?"<>|]+/g, "-");
  doc.save(`${safe}.pdf`);
}

type Props = {
  supplierId: number;
  supplierName: string;
  supplierCode: string;
  openingBalance: number;
};

export function SupplierLedgerPanel({ supplierId, supplierName, supplierCode, openingBalance }: Props) {
  const today = useMemo(() => new Date(), []);

  const [from, setFrom] = useState(() => toYmd(startOfMonth(today)));
  const [to, setTo] = useState(() => toYmd(today));

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const printRef = useRef<HTMLDivElement>(null);
  const triggerPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${supplierCode}-ledger-${from}-${to}`.replace(/[\\/:*?"<>|]+/g, "-"),
  });

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const r = await fetch(`/api/suppliers/${supplierId}/ledger?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const payload = (await r.json()) as ApiResponse | { error?: string };
      if (!r.ok) {
        setData(null);
        setError(typeof (payload as { error?: string }).error === "string" ? (payload as { error: string }).error : "Failed to load ledger.");
        return;
      }
      setData(payload as ApiResponse);
    } catch {
      setData(null);
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [supplierId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const entries = data?.entries ?? [];
  const business = data?.business ?? fallbackBusiness();

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Typography variant="h6" sx={{ "@media print": { display: "none" } }}>
              Ledger (by date)
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center", gap: 1, "@media print": { display: "none" } }}>
              <TextField
                label="From"
                type="date"
                size="small"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="To"
                type="date"
                size="small"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={() => void load()} disabled={loading}>
                Apply
              </Button>
              <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={() => triggerPrint()} disabled={loading || !data}>
                Print
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<PictureAsPdfIcon />}
                onClick={() =>
                  void downloadLedgerPdf({ name: supplierName, code: supplierCode }, business, openingBalance, from, to, entries)
                }
                disabled={loading || !data}
              >
                Download PDF
              </Button>
            </Stack>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ "@media print": { display: "none" } }}>
            Opening balance (reference): {formatCurrency(openingBalance)} · Pre balance is before the line; debit/credit follow the
            entry type; balance is after the line.
          </Typography>

          {error ? (
            <Typography color="error" variant="body2" sx={{ "@media print": { display: "none" } }}>
              {error}
            </Typography>
          ) : null}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3, "@media print": { display: "none" } }}>
              <CircularProgress size={32} />
            </Box>
          ) : null}

          <Box
            ref={printRef}
            className="supplier-ledger-print-root"
            sx={{
              bgcolor: "#fff",
              color: "text.primary",
              "@media print": {
                printColorAdjust: "exact",
                WebkitPrintColorAdjust: "exact",
              },
            }}
          >
            <Box
              component="style"
              dangerouslySetInnerHTML={{
                __html: `
                  @media print {
                    .supplier-ledger-print-table thead { display: table-header-group; }
                    .supplier-ledger-print-table { page-break-inside: auto; }
                    .supplier-ledger-print-table tr { page-break-inside: avoid; page-break-after: auto; }
                  }
                `,
              }}
            />

            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
                "@media print": { boxShadow: "none", borderRadius: 0, border: "1px solid #cbd5e1" },
              }}
            >
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  background: "linear-gradient(135deg, rgb(0, 107, 149) 0%, #0099D6 100%)",
                  color: "#fff",
                }}
              >
                <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "nowrap" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={BRAND_LOGO_SRC}
                    alt=""
                    width={56}
                    height={56}
                    style={{
                      objectFit: "contain",
                      flexShrink: 0,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.18)",
                      padding: 4,
                    }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="overline" sx={{ letterSpacing: 2, fontWeight: 700, opacity: 0.9, display: "block" }}>
                      Account ledger
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.25, mt: 0.5 }}>
                      {business.businessName}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.5 }}>
                      Supplier party ledger — dated statement
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Box sx={{ px: 2.5, py: 2, bgcolor: "grey.50", borderBottom: 1, borderColor: "divider" }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase" }}>
                      Supplier
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {supplierName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Code: {supplierCode}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase" }}>
                      Period
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {from} → {to}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Opening balance (ref.): {formatCurrency(openingBalance)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {entries.length} line{entries.length === 1 ? "" : "s"} in range
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <TableContainer sx={{ px: 0, overflowX: "auto" }}>
                <Table
                  size="small"
                  className="supplier-ledger-print-table"
                  sx={{
                    minWidth: 720,
                    "& .MuiTableCell-root": { fontSize: "0.8125rem" },
                    "& .MuiTableHead-root .MuiTableCell-root": {
                      fontWeight: 700,
                      bgcolor: "rgba(0, 107, 149, 0.12)",
                      color: "text.primary",
                      borderBottom: "2px solid",
                      borderColor: "primary.main",
                    },
                    "& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)": {
                      bgcolor: "action.hover",
                    },
                    "@media print": {
                      "& .MuiTableHead-root .MuiTableCell-root": {
                        printColorAdjust: "exact",
                        WebkitPrintColorAdjust: "exact",
                      },
                      "& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)": {
                        printColorAdjust: "exact",
                        WebkitPrintColorAdjust: "exact",
                      },
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell width="11%">Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right" width="13%">
                        Pre balance
                      </TableCell>
                      <TableCell align="right" width="11%">
                        Debit
                      </TableCell>
                      <TableCell align="right" width="11%">
                        Credit
                      </TableCell>
                      <TableCell align="right" width="13%">
                        Balance
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.map((entry) => {
                      const pre = partyLedgerPreBalance(entry.type, entry.amount, entry.runningBalance);
                      const { debit, credit } = partyLedgerDebitCreditAmounts(entry.type, entry.amount);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>{formatDate(entry.entryDate)}</TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                            {formatCurrency(pre)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                            {debit > 0 ? formatCurrency(debit) : "—"}
                          </TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                            {credit > 0 ? formatCurrency(credit) : "—"}
                          </TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                            {formatCurrency(entry.runningBalance)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!loading && entries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                          No ledger entries in this date range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  borderTop: 1,
                  borderColor: "divider",
                  bgcolor: "grey.50",
                  "@media print": {
                    printColorAdjust: "exact",
                    WebkitPrintColorAdjust: "exact",
                  },
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", fontWeight: 600 }}>
                  {business.businessName}
                </Typography>
                {business.phone ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 0.25 }}>
                    {business.phone}
                  </Typography>
                ) : null}
                {business.address ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", textAlign: "center", mt: 0.75, whiteSpace: "pre-line", maxWidth: 560, mx: "auto" }}
                  >
                    {business.address}
                  </Typography>
                ) : null}
                {business.ntnNumber ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 0.75 }}>
                    {business.ntnNumber}
                  </Typography>
                ) : null}
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 1.5, fontStyle: "italic" }}>
                  Computer-generated statement. Signature not required.
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: "block", textAlign: "center", mt: 0.5 }}>
                  Printed {format(new Date(), "yyyy-MM-dd HH:mm")}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
