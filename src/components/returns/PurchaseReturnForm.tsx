"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
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

type Line = {
  purchaseItemId: number;
  productName: string;
  productCode: string;
  displayUnit: string;
  maxDisplayQty: number;
};

type Summary = {
  purchaseId: number;
  invoiceNo: string;
  internalRef: string;
  supplierId: number;
  items: Line[];
};

export function PurchaseReturnForm({ purchaseId }: { purchaseId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [qtyByLine, setQtyByLine] = useState<Record<number, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/purchases/${purchaseId}/returnable`);
        if (!res.ok) {
          setError(await errorMessageFromFetchResponse(res));
          return;
        }
        const data = (await res.json()) as Summary;
        setSummary(data);
        const init: Record<number, string> = {};
        for (const it of data.items) init[it.purchaseItemId] = "";
        setQtyByLine(init);
      } catch {
        setError("Failed to load purchase.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [purchaseId]);

  async function submit() {
    if (!summary) return;
    const items = summary.items.flatMap((it) => {
      const raw = qtyByLine[it.purchaseItemId]?.trim() ?? "";
      if (!raw) return [];
      const q = Number(raw);
      if (!Number.isFinite(q) || q <= 0) return [];
      if (q - it.maxDisplayQty > 1e-9) return [];
      return [{ purchaseItemId: it.purchaseItemId, displayQty: q }];
    });
    if (items.length === 0) {
      setError("Enter a return quantity for at least one line.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() || undefined, items }),
      });
      if (!res.ok) {
        setError(await errorMessageFromFetchResponse(res));
        return;
      }
      router.push(`/purchases/${purchaseId}`);
      router.refresh();
    } catch {
      setError("Could not save purchase return.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", gap: 2 }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading purchase…</Typography>
      </Box>
    );
  }

  if (!summary) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || "Could not load purchase."}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Purchase return" />
      <Box sx={{ flex: 1, overflow: "auto", py: 3, px: 2 }}>
        <Paper sx={{ maxWidth: 900, mx: "auto", p: { xs: 2, sm: 3 }, boxShadow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {summary.internalRef} · {summary.invoiceNo}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Remove stock and reduce supplier payable (when you have enough on-hand stock to send back).
          </Typography>

          <TextField size="small" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth sx={{ mb: 2 }} />

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
                  <TableRow key={it.purchaseItemId}>
                    <TableCell>{it.productName}</TableCell>
                    <TableCell>{it.displayUnit}</TableCell>
                    <TableCell align="right" colSpan={2}>
                      <Typography variant="caption" color="text.secondary">
                        Already fully returned
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={it.purchaseItemId}>
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
                        value={qtyByLine[it.purchaseItemId] ?? ""}
                        onChange={(e) => setQtyByLine((prev) => ({ ...prev, [it.purchaseItemId]: e.target.value }))}
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
            <Button variant="text" onClick={() => router.push(`/purchases/${purchaseId}`)} disabled={saving}>
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
