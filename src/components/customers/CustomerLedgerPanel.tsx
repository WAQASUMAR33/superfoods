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
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";

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
  customer: { id: number; name: string; code: string; openingBalance: number };
  range: { from: string; to: string };
  entries: LedgerEntry[];
};

function toYmd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function downloadLedgerPdf(
  customer: { name: string; code: string },
  fromYmd: string,
  toYmd: string,
  entries: LedgerEntry[]
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.text("Customer ledger", 14, 16);
  doc.setFontSize(10);
  doc.text(`${customer.name} (${customer.code})`, 14, 23);
  doc.text(`Period: ${fromYmd} to ${toYmd}`, 14, 29);
  doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 14, 35);

  const body = entries.map((e) => [
    formatDate(e.entryDate),
    e.description.replace(/\s+/g, " ").slice(0, 90),
    formatCurrency(e.amount),
    formatCurrency(e.runningBalance),
  ]);

  autoTable(doc, {
    startY: 42,
    head: [["Date", "Description", "Amount", "Running balance"]],
    body: body.length ? body : [["—", "No entries in this period", "", ""]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [0, 120, 180] },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 85 },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", cellWidth: 35 },
    },
  });

  const safe = `${customer.code}-ledger-${fromYmd}-${toYmd}`.replace(/[\\/:*?"<>|]+/g, "-");
  doc.save(`${safe}.pdf`);
}

type Props = {
  customerId: number;
  customerName: string;
  customerCode: string;
  openingBalance: number;
};

export function CustomerLedgerPanel({ customerId, customerName, customerCode, openingBalance }: Props) {
  const today = useMemo(() => new Date(), []);

  const [from, setFrom] = useState(() => toYmd(startOfMonth(today)));
  const [to, setTo] = useState(() => toYmd(today));

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const printRef = useRef<HTMLDivElement>(null);
  const triggerPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${customerCode}-ledger-${from}-${to}`.replace(/[\\/:*?"<>|]+/g, "-"),
  });

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const r = await fetch(`/api/customers/${customerId}/ledger?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
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
  }, [customerId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const entries = data?.entries ?? [];

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
                onClick={() => downloadLedgerPdf({ name: customerName, code: customerCode }, from, to, entries)}
                disabled={loading || !data}
              >
                Download PDF
              </Button>
            </Stack>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ "@media print": { display: "none" } }}>
            Opening balance (reference): {formatCurrency(openingBalance)} · Balance column is the stored running balance after each entry.
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

          <Box ref={printRef}>
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {customerName} ({customerCode})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ledger from {from} to {to}
              </Typography>
            </Box>

            <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Amount
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Balance
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.entryDate)}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(entry.runningBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
                        No ledger entries in this date range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
