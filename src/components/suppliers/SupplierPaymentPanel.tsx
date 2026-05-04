"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { formatCurrency, formatDate } from "@/lib/utils";

export type OpenPurchaseRow = {
  id: number;
  invoiceNo: string;
  internalRef: string;
  purchaseDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
};

const METHODS = ["CASH", "BANK_TRANSFER", "CHEQUE", "CREDIT"] as const;

type Props = {
  supplierId: number;
  supplierName: string;
  /** Party ledger balance (payable); same basis as supplier detail. */
  ledgerBalanceDue: number;
  openPurchases: OpenPurchaseRow[];
};

export function SupplierPaymentPanel({ supplierId, supplierName, ledgerBalanceDue, openPurchases }: Props) {
  const router = useRouter();
  const [purchaseId, setPurchaseId] = useState<number>(() => openPurchases[0]?.id ?? 0);
  const [amount, setAmount] = useState<string>(() =>
    openPurchases[0] != null ? String(openPurchases[0].balanceDue) : ledgerBalanceDue > 0 ? String(ledgerBalanceDue) : ""
  );
  const [method, setMethod] = useState<(typeof METHODS)[number]>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => openPurchases.find((p) => p.id === purchaseId) ?? null,
    [openPurchases, purchaseId]
  );

  function onPurchaseChange(id: number) {
    setPurchaseId(id);
    const p = openPurchases.find((x) => x.id === id);
    if (p) setAmount(String(p.balanceDue));
  }

  async function handlePurchasePayment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!purchaseId || !selected) {
      setError("Select a purchase with an outstanding balance.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }
    if (amt > selected.balanceDue + 0.005) {
      setError(`Amount cannot exceed balance due (${formatCurrency(selected.balanceDue)}).`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          method,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Payment failed.");
        return;
      }
      router.push(`/suppliers/${supplierId}`);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLedgerPayment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }
    if (amt > ledgerBalanceDue + 0.005) {
      setError(`Amount cannot exceed ledger balance due (${formatCurrency(ledgerBalanceDue)}).`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          method,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Payment failed.");
        return;
      }
      router.push(`/suppliers/${supplierId}`);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  const showOnAccount = openPurchases.length === 0 && ledgerBalanceDue > 0.005;
  const nothingToPay = openPurchases.length === 0 && ledgerBalanceDue <= 0.005;

  if (nothingToPay) {
    return (
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Record supplier payment</Typography>
            <Typography variant="body2" color="text.secondary">
              There is no outstanding purchase balance and no payable balance on the party ledger for {supplierName}.
            </Typography>
            <Box>
              <Link href={`/suppliers/${supplierId}`} style={{ textDecoration: "none", display: "inline-flex" }}>
                <Button component="span" startIcon={<ArrowBackIcon />} variant="outlined" size="small">
                  Back to supplier
                </Button>
              </Link>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (showOnAccount) {
    return (
      <Card component="form" onSubmit={(e) => void handleLedgerPayment(e)}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Pay supplier (on account)</Typography>
            <Typography variant="body2" color="text.secondary">
              No open purchase invoices with balance due. This posts a journal entry (reduce AP, credit cash/bank) and a{" "}
              <strong>supplier party ledger</strong> line so the running balance matches.
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Ledger balance due: {formatCurrency(ledgerBalanceDue)}
            </Typography>

            {error ? (
              <Alert severity="error" onClose={() => setError("")}>
                {error}
              </Alert>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                required
                label="Amount (EUR)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                sx={{ flex: 1 }}
                slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
              />
              <TextField
                select
                label="Method"
                value={method}
                onChange={(e) => setMethod(e.target.value as (typeof METHODS)[number])}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="BANK_TRANSFER">Bank transfer</MenuItem>
                <MenuItem value="CHEQUE">Cheque</MenuItem>
                <MenuItem value="CREDIT">Credit / ledger</MenuItem>
              </TextField>
            </Stack>

            <TextField
              label="Reference (optional)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Cheque / transaction no."
              fullWidth
            />
            <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={2} />

            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
              <Link href={`/suppliers/${supplierId}`} style={{ textDecoration: "none", display: "inline-flex" }}>
                <Button component="span" variant="outlined" size="small">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? "Saving…" : "Record payment & ledger"}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      <Card component="form" onSubmit={(e) => void handlePurchasePayment(e)}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Pay against purchase invoice</Typography>
            <Typography variant="body2" color="text.secondary">
              Updates the bill, posts journal lines, and adds a matching <strong>party ledger</strong> entry.
            </Typography>

            {error ? (
              <Alert severity="error" onClose={() => setError("")}>
                {error}
              </Alert>
            ) : null}

            <TextField
              select
              required
              label="Purchase (balance due)"
              value={purchaseId || ""}
              onChange={(e) => onPurchaseChange(Number(e.target.value))}
              slotProps={{ inputLabel: { shrink: true } }}
            >
              {openPurchases.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.invoiceNo} · {formatDate(p.purchaseDate)} — balance {formatCurrency(p.balanceDue)}
                </MenuItem>
              ))}
            </TextField>

            {selected ? (
              <Typography variant="caption" color="text.secondary">
                Total {formatCurrency(selected.totalAmount)} · Paid {formatCurrency(selected.paidAmount)} · Ref {selected.internalRef}
              </Typography>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                required
                label="Amount (EUR)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                sx={{ flex: 1 }}
                slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
              />
              <TextField
                select
                label="Method"
                value={method}
                onChange={(e) => setMethod(e.target.value as (typeof METHODS)[number])}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="BANK_TRANSFER">Bank transfer</MenuItem>
                <MenuItem value="CHEQUE">Cheque</MenuItem>
                <MenuItem value="CREDIT">Credit / ledger</MenuItem>
              </TextField>
            </Stack>

            <TextField
              label="Reference (optional)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Cheque / transaction no."
              fullWidth
            />
            <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={2} />

            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
              <Link href={`/suppliers/${supplierId}`} style={{ textDecoration: "none", display: "inline-flex" }}>
                <Button component="span" variant="outlined" size="small">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="contained" disabled={saving || !purchaseId}>
                {saving ? "Saving…" : "Record payment"}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {ledgerBalanceDue > 0.005 ? (
        <>
          <Divider />
          <Typography variant="caption" color="text.secondary">
            Party ledger balance due (after invoices): {formatCurrency(ledgerBalanceDue)}. Pay open invoices above first;
            on-account-only payment is available when there are no open invoice balances.
          </Typography>
        </>
      ) : null}
    </Stack>
  );
}
