"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { errorMessageFromFetchResponse } from "@/lib/httpErrorMessage";

type BrandRow = { id: number; name: string; isActive: boolean };

export function BrandManagementPanel({ initialBrands }: { initialBrands: BrandRow[] }) {
  const [rows, setRows] = useState(initialBrands);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string>("");
  const [createName, setCreateName] = useState("");
  const [edit, setEdit] = useState<BrandRow | null>(null);
  const sorted = useMemo(() => [...rows].sort((a, b) => a.name.localeCompare(b.name)), [rows]);

  async function refresh() {
    const res = await fetch("/api/brands");
    if (!res.ok) throw new Error(await errorMessageFromFetchResponse(res));
    const data = (await res.json()) as BrandRow[];
    setRows(data);
  }

  async function createBrand() {
    setBusy(true);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName }),
      });
      if (!res.ok) throw new Error(await errorMessageFromFetchResponse(res));
      setCreateName("");
      await refresh();
      setBanner("Brand created.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Could not create brand.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!edit) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/brands/${edit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      if (!res.ok) throw new Error(await errorMessageFromFetchResponse(res));
      setEdit(null);
      await refresh();
      setBanner("Brand saved.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Could not save brand.");
    } finally {
      setBusy(false);
    }
  }

  async function removeBrand(row: BrandRow) {
    setBusy(true);
    try {
      const res = await fetch(`/api/brands/${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await errorMessageFromFetchResponse(res));
      await refresh();
      setBanner("Brand deleted.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Could not remove brand.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField size="small" label="New brand name" value={createName} onChange={(e) => setCreateName(e.target.value)} fullWidth />
        <Button variant="contained" disabled={busy || !createName.trim()} onClick={() => void createBrand()}>
          {busy ? <CircularProgress size={18} /> : "Add"}
        </Button>
      </Box>
      {banner ? <Alert sx={{ mb: 2 }} severity="info">{banner}</Alert> : null}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.name}</TableCell>
              <TableCell align="right">
                <Button size="small" onClick={() => setEdit({ ...r })}>Edit</Button>
                <Button size="small" color="error" onClick={() => void removeBrand(r)}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {sorted.length === 0 ? (
            <TableRow><TableCell colSpan={2}><Typography color="text.secondary">No brands found.</Typography></TableCell></TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog open={edit !== null} onClose={() => setEdit(null)} fullWidth maxWidth="xs">
        <DialogTitle>Edit brand</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px!important" }}>
          <TextField label="Name" value={edit?.name ?? ""} onChange={(e) => setEdit((p) => (p ? { ...p, name: e.target.value } : p))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveEdit()} disabled={busy || !(edit?.name ?? "").trim()}>Save</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
