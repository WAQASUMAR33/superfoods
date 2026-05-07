"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";

import { Header } from "@/components/layout/Header";
import { errorMessageFromFetchResponse } from "@/lib/httpErrorMessage";

type ReturnLine = {
  saleItemId: number;
  productName: string;
  productCode: string;
  displayUnit: string;
  maxDisplayQty: number;
};

type ReturnSummary = {
  saleId: number;
  invoiceNo: string;
  customerId: number | null;
  paymentMethod: string;
  creditAmount: number;
  status: string;
  items: ReturnLine[];
};

export function SaleReturnForm({ saleId }: { saleId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<ReturnSummary | null>(null);
  const [error, setError] = useState("");
  const [refundMethod, setRefundMethod] = useState<"CASH" | "CREDIT">("CASH");
  const [notes, setNotes] = useState("");
  const [qtyBySaleItemId, setQtyBySaleItemId] = useState<Record<number, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sales/${saleId}/returnable`);
        if (!res.ok) {
          setError(await errorMessageFromFetchResponse(res));
          return;
        }
        const data = (await res.json()) as ReturnSummary;
        setSummary(data);
        const init: Record<number, string> = {};
        for (const it of data.items) init[it.saleItemId] = "";
        setQtyBySaleItemId(init);
      } catch {
        setError("Failed to load sale.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [saleId]);

  const hadReceivableImpact = useMemo(() => {
    if (!summary) return false;
    return !!(
      summary.customerId &&
      (summary.status === "CREDIT" || summary.status === "PARTIALLY_PAID" || summary.creditAmount > 0.009)
    );
  }, [summary]);

  async function submit() {
    if (!summary) return;
    const items = summary.items.flatMap((it) => {
      const raw = qtyBySaleItemId[it.saleItemId]?.trim() ?? "";
      if (!raw) return [];
      const q = Number(raw);
      if (!Number.isFinite(q) || q <= 0) return [];
      if (q - it.maxDisplayQty > 1e-9) return [];
      return [{ saleItemId: it.saleItemId, displayQty: q }];
    });
    if (items.length === 0) {
      setError("Enter a return quantity for at least one line.");
      return;
    }
    if (refundMethod === "CREDIT" && !hadReceivableImpact) {
      setError("Credit refunds apply only when the sale had unpaid customer balance.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/sales/${saleId}/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundMethod, notes: notes.trim() || undefined, items }),
      });
      if (!res.ok) {
        setError(await errorMessageFromFetchResponse(res));
        return;
      }
      router.push(`/sales/${saleId}`);
      router.refresh();
    } catch {
      setError("Could not save sale return.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", gap: 2 }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading sale…</Typography>
      </Box>
    );
  }

  if (!summary) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || "Could not load sale."}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Sale return" />
      <Box sx={{ flex: 1, overflow: "auto", py: 3, px: 2 }}>
        <Paper sx={{ maxWidth: 900, mx: "auto", p: { xs: 2, sm: 3 }, boxShadow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Invoice {summary.invoiceNo}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Return stock to inventory and reverse revenue ({hadReceivableImpact ? "credit note or cash refund" : "cash refund"} accounting).
          </Typography>

          <Stack spacing={2} sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Refund</InputLabel>
              <Select value={refundMethod} label="Refund" onChange={(e) => setRefundMethod(e.target.value as "CASH" | "CREDIT")}>
                <MenuItem value="CASH">Cash / bank — credit cash</MenuItem>
                <MenuItem value="CREDIT" disabled={!hadReceivableImpact}>
                  Reduce receivable (credit memo)
                </MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 600, bgcolor: "action.hover", fontSize: 11 } }}>
                <TableCell>Product</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell align="right">Max qty</TableCell>
                <TableCell align="right">Return qty</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.items.map((it) =>
                it.maxDisplayQty <= 0 ? (
                  <TableRow key={it.saleItemId}>
                    <TableCell>{it.productName}</TableCell>
                    <TableCell>{it.displayUnit}</TableCell>
                    <TableCell align="right" colSpan={2}>
                      <Typography variant="caption" color="text.secondary">
                        Already fully returned
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={it.saleItemId}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {it.productName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                        {it.productCode}
                      </Typography>
                    </TableCell>
                    <TableCell>{it.displayUnit}</TableCell>
                    <TableCell align="right">{it.maxDisplayQty.toFixed(3)}</TableCell>
                    <TableCell align="right" sx={{ width: 140 }}>
                      <TextField
                        size="small"
                        type="number"
                        slotProps={{
                          htmlInput: { min: 0, step: "any", style: { textAlign: "right" as const } },
                        }}
                        value={qtyBySaleItemId[it.saleItemId] ?? ""}
                        onChange={(e) => setQtyBySaleItemId((prev) => ({ ...prev, [it.saleItemId]: e.target.value }))}
                      />
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>

          {error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          ) : null}

          <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: "flex-end" }}>
            <Button variant="text" onClick={() => router.push(`/sales/${saleId}`)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="contained" onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Confirm return"}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
