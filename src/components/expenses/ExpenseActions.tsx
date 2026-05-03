"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

type CategoryOption = { id: number; name: string };
type ExpensePayload = {
  id: number;
  categoryId: number;
  amount: number | string;
  description: string | null;
  expenseDate: string | Date;
  paymentMethod: string;
  reference: string | null;
};

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CHEQUE", "CREDIT"] as const;

export function ExpenseActions({
  expense,
  categories,
}: {
  expense: ExpensePayload;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const initialDate = useMemo(() => new Date(expense.expenseDate).toISOString().slice(0, 10), [expense.expenseDate]);
  const [form, setForm] = useState({
    categoryId: String(expense.categoryId),
    amount: String(expense.amount),
    description: expense.description ?? "",
    expenseDate: initialDate,
    paymentMethod: expense.paymentMethod,
    reference: expense.reference ?? "",
  });

  async function handleUpdate() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: Number(form.categoryId),
          amount: Number(form.amount),
          description: form.description.trim(),
          expenseDate: form.expenseDate,
          paymentMethod: form.paymentMethod,
          reference: form.reference.trim(),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: payload?.error ?? "Could not update expense." });
        return;
      }
      setMessage({ type: "success", text: "Expense updated." });
      setEditOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: payload?.error ?? "Could not delete expense." });
        return;
      }
      setConfirmOpen(false);
      setMessage({ type: "success", text: "Expense deleted." });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
      <Button size="small" variant="text" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
        Edit
      </Button>
      <Button
        size="small"
        color="error"
        variant="text"
        startIcon={<DeleteIcon />}
        onClick={() => setConfirmOpen(true)}
      >
        Delete
      </Button>

      <Dialog open={editOpen} onClose={() => !saving && setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Expense</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2 }}>
            {message && <Alert severity={message.type}>{message.text}</Alert>}
            <TextField
              select
              label="Category"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              {categories.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Amount"
              type="number"
              slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <TextField
              label="Date"
              type="date"
              value={form.expenseDate}
              onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <TextField
              select
              label="Payment Method"
              value={form.paymentMethod}
              onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
            >
              {PAYMENT_METHODS.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Reference"
              value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} variant="contained" disabled={saving || !form.categoryId || Number(form.amount) <= 0}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => !saving && setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete expense?</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ fontSize: 14, color: "text.secondary" }}>
            This action cannot be undone. The expense record and linked journal entry will be removed.
          </Box>
          {message && message.type === "error" && <Alert severity="error" sx={{ mt: 2 }}>{message.text}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={saving}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
