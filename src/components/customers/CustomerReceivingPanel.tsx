"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { formatCurrency } from "@/lib/utils";

type Props = {
  customerId: number;
  customerName: string;
  ledgerBalanceDue: number;
};

function numericOnly(v: string) {
  return v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
}

export function CustomerReceivingPanel({ customerId, customerName, ledgerBalanceDue }: Props) {
  const router = useRouter();
  const [cashAmount, setCashAmount] = useState("");
  const [chequeAmount, setChequeAmount] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const cash = Number(cashAmount) || 0;
  const cheque = Number(chequeAmount) || 0;
  const bank = Number(bankAmount) || 0;
  const totalReceiving = cash + cheque + bank;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (totalReceiving <= 0) {
      setError("Enter at least one payment amount.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashAmount: cash,
          chequeAmount: cheque,
          bankAmount: bank,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Receipt failed.");
        return;
      }
      setSuccess(`Receipt of ${formatCurrency(totalReceiving)} recorded successfully (${payload.entryNo}).`);
      setCashAmount("");
      setChequeAmount("");
      setBankAmount("");
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
        <Stack spacing={2.5}>
          <Typography variant="h6">Receive Payment</Typography>
          <Typography variant="body2" color="text.secondary">
            Record payment received from <strong>{customerName}</strong>. You can split across Cash, Cheque, and
            Bank transfer. A journal entry and party ledger update will be created automatically.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ px: 2, py: 1, bgcolor: ledgerBalanceDue > 0 ? "warning.50" : "success.50", borderRadius: 1, border: 1, borderColor: ledgerBalanceDue > 0 ? "warning.200" : "success.200" }}>
              <Typography variant="caption" color="text.secondary">Balance Due</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: ledgerBalanceDue > 0 ? "warning.main" : "success.main" }}>
                {formatCurrency(ledgerBalanceDue)}
              </Typography>
            </Box>
            {totalReceiving > 0 && (
              <Box sx={{ px: 2, py: 1, bgcolor: "primary.50", borderRadius: 1, border: 1, borderColor: "primary.200" }}>
                <Typography variant="caption" color="text.secondary">Total Receiving</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                  {formatCurrency(totalReceiving)}
                </Typography>
              </Box>
            )}
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

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
            Payment Amounts
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Cash"
              type="text"
              inputMode="decimal"
              value={cashAmount}
              onChange={(e) => setCashAmount(numericOnly(e.target.value))}
              onFocus={(e) => { if (e.target.value === "0") setCashAmount(""); }}
              placeholder="0.00"
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { style: { fontVariantNumeric: "tabular-nums" } } }}
            />
            <TextField
              label="Cheque"
              type="text"
              inputMode="decimal"
              value={chequeAmount}
              onChange={(e) => setChequeAmount(numericOnly(e.target.value))}
              onFocus={(e) => { if (e.target.value === "0") setChequeAmount(""); }}
              placeholder="0.00"
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { style: { fontVariantNumeric: "tabular-nums" } } }}
            />
            <TextField
              label="Bank Transfer"
              type="text"
              inputMode="decimal"
              value={bankAmount}
              onChange={(e) => setBankAmount(numericOnly(e.target.value))}
              onFocus={(e) => { if (e.target.value === "0") setBankAmount(""); }}
              placeholder="0.00"
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { style: { fontVariantNumeric: "tabular-nums" } } }}
            />
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
            <Button type="submit" variant="contained" disabled={saving || totalReceiving <= 0}>
              {saving ? "Saving…" : `Record Payment${totalReceiving > 0 ? ` (${formatCurrency(totalReceiving)})` : ""}`}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
