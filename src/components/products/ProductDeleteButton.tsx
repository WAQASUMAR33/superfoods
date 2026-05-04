"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { errorMessageFromFetchResponse } from "@/lib/httpErrorMessage";

type Props = {
  productId: number;
  productName: string;
  size?: "small" | "medium";
};

export function ProductDeleteButton({ productId, productName, size = "small" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelete() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (res.ok) {
        setOpen(false);
        router.refresh();
        return;
      }
      setError(await errorMessageFromFetchResponse(res));
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size={size}
        color="error"
        variant="outlined"
        startIcon={<DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />}
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>
      <Dialog open={open} onClose={() => !busy && setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove product?</DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-700">
            <strong>{productName}</strong> will be hidden from lists and the POS. Existing sales and purchases are kept for
            records.
          </p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={busy}>
            {busy ? "Removing…" : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
