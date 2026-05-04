"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { formatCurrency } from "@/lib/utils";

const METHODS = ["CASH", "BANK_TRANSFER", "CHEQUE"] as const;

type Props = {
  customerId: number;
  customerName: string;
  /** Current receivable on the customer party ledger (not tied to a specific invoice). */
  ledgerBalanceDue: number;
};

/**
 * General customer receipt: reduces AR and party ledger only — no invoice allocation.
 */
export function CustomerReceivingPanel({ customerId, customerName, ledgerBalanceDue }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState<string>(() => (ledgerBalanceDue > 0 ? String(ledgerBalanceDue) : ""));
  const [method, setMethod] = useState<(typeof METHODS)[number]>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid receipt amount.");
      return;
    }
    if (amt > ledgerBalanceDue + 0.005) {
      setError(`Amount cannot exceed balance due (${formatCurrency(ledgerBalanceDue)}).`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/payments`, {
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
        setError(typeof payload.error === "string" ? payload.error : "Receipt failed.");
        return;
      }
      router.push(`/customers/${customerId}`);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (ledgerBalanceDue <= 0.005) {
    return (
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">General receipt</Typography>
            <Typography variant="body2" color="text.secondary">
              There is no receivable balance on the party ledger for {customerName}. General receipts apply to the
              customer account only (not to a specific invoice).
            </Typography>
            <Box>
              <Link href={`/customers/${customerId}`} style={{ textDecoration: "none", display: "inline-flex" }}>
                <Button component="span" startIcon={<ArrowBackIcon />} variant="outlined" size="small">
                  Back to customer
                </Button>
              </Link>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card component="form" onSubmit={(e) => void handleSubmit(e)}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">General receipt</Typography>
          <Typography variant="body2" color="text.secondary">
            Record cash or bank received from {customerName}. This posts to the general ledger (cash/bank vs accounts
            receivable) and updates the <strong>customer party ledger</strong>. It is <strong>not</strong> allocated to a
            specific invoice number.
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Balance due (ledger): {formatCurrency(ledgerBalanceDue)}
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
            </TextField>
          </Stack>

          <TextField
            label="Reference (optional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Receipt / transaction reference"
            fullWidth
          />
          <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={2} />

          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
            <Link href={`/customers/${customerId}`} style={{ textDecoration: "none", display: "inline-flex" }}>
              <Button component="span" variant="outlined" size="small">
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving…" : "Record general receipt"}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
