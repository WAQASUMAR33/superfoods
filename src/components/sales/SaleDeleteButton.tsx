"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

type Props = {
  saleId: number;
  invoiceNo: string;
  returnCount?: number;
};

export function SaleDeleteButton({ saleId, invoiceNo, returnCount = 0 }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setError("");
    setDeleting(true);
    try {
      const res = await fetch(`/api/sales/${saleId}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Could not delete sale.");
        return;
      }
      setOpen(false);
      router.push("/sales");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="error"
        startIcon={<DeleteOutlineOutlinedIcon />}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        Delete sale
      </Button>

      <Dialog open={open} onClose={() => !deleting && setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete sale?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This permanently deletes sale <strong>{invoiceNo}</strong>
            {returnCount > 0
              ? ` and ${returnCount} linked sale return${returnCount === 1 ? "" : "s"} (including all return line items)`
              : ""}
            . Stock movements, journal entries, and customer ledger entries for this sale are removed and balances
            are recalculated. This cannot be undone.
          </DialogContentText>
          {error ? (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={() => void handleDelete()} color="error" variant="contained" disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
