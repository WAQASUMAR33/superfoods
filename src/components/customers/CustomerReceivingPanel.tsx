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
import { formatCurrency } from "@/lib/utils";

const METHODS = ["CASH", "BANK_TRANSFER", "CHEQUE"] as const;

type Props = {
  customerId: number;
  customerName: string;
  ledgerBalanceDue: number;
};

export function CustomerReceivingPanel({ customerId, customerName, ledgerBalanceDue }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid receipt amount.");
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
      setSuccess(`Receipt of ${formatCurrency(amt)} recorded successfully (${payload.entryNo}).`);
      setAmount("");
      setReference("");
      setNotes("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card component="form" onSubmit={(e) => void handleSubmit(e)}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Receive Payment</Typography>
          <Typography variant="body2" color="text.secondary">
            Record a general payment received from <strong>{customerName}</strong>. This creates a journal entry
            (DR Cash/Bank, CR Accounts Receivable) and updates the customer party ledger.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ px: 2, py: 1, bgcolor: ledgerBalanceDue > 0 ? "warning.50" : "success.50", borderRadius: 1, border: 1, borderColor: ledgerBalanceDue > 0 ? "warning.200" : "success.200" }}>
              <Typography variant="caption" color="text.secondary">Current Balance Due</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: ledgerBalanceDue > 0 ? "warning.main" : "success.main" }}>
                {formatCurrency(ledgerBalanceDue)}
              </Typography>
            </Box>
          </Box>

          {error ? (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          ) : null}

          {success ? (
            <Alert severity="success" onClose={() => setSuccess("")}>
              {success}
            </Alert>
          ) : null}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              required
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
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
                Back to customer
              </Button>
            </Link>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving…" : "Record Payment"}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
