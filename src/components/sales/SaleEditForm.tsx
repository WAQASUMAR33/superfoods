"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  saleId: number;
  invoiceNo: string;
  saleDateISO: string;
  notes: string;
};

export function SaleEditForm({ saleId, invoiceNo: initialInvoice, saleDateISO, notes: initialNotes }: Props) {
  const router = useRouter();
  const [invoiceNo, setInvoiceNo] = useState(initialInvoice);
  const [saleDateLocal, setSaleDateLocal] = useState(() => toDatetimeLocalValue(saleDateISO));
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmedInvoice = invoiceNo.trim();
    if (!trimmedInvoice) {
      setError("Invoice number is required.");
      return;
    }
    if (!saleDateLocal) {
      setError("Sale date is required.");
      return;
    }
    const parsed = new Date(saleDateLocal);
    if (Number.isNaN(parsed.getTime())) {
      setError("Invalid sale date.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNo: trimmedInvoice,
          saleDate: parsed.toISOString(),
          notes: notes.trim() === "" ? null : notes.trim(),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Could not save changes.");
        return;
      }
      router.push(`/sales/${saleId}`);
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
          <Typography variant="body2" color="text.secondary">
            Update invoice details and notes. Totals, payments, line items, and accounting entries are not changed here.
          </Typography>

          {error ? (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          ) : null}

          <TextField
            required
            label="Invoice number"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 191 } }}
          />
          <TextField
            required
            label="Sale date & time"
            type="datetime-local"
            value={saleDateLocal}
            onChange={(e) => setSaleDateLocal(e.target.value)}
            fullWidth
            slotProps={{ htmlInput: { step: 60 } }}
          />
          <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={3} />

          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
            <Button component={Link} href={`/sales/${saleId}`} variant="outlined" size="small">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
