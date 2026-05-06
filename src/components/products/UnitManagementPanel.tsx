"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
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

type UnitRow = { id: number; code: string; name: string; kgFactor: number; isActive: boolean };

export function UnitManagementPanel({ initialUnits }: { initialUnits: UnitRow[] }) {
  const [rows, setRows] = useState(initialUnits);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string>("");
  const [edit, setEdit] = useState<UnitRow | null>(null);
  const [create, setCreate] = useState({ code: "", name: "", kgFactor: 1 });
  const sorted = useMemo(() => [...rows].sort((a, b) => a.code.localeCompare(b.code)), [rows]);

  async function refresh() {
    const res = await fetch("/api/units");
    if (!res.ok) throw new Error(await errorMessageFromFetchResponse(res));
    const data = (await res.json()) as UnitRow[];
    setRows(data.map((u) => ({ ...u, kgFactor: Number(u.kgFactor) })));
  }

  async function createUnit() {
    setBusy(true);
    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: create.code, name: create.name, kgFactor: Number(create.kgFactor) }),
      });
      if (!res.ok) throw new Error(await errorMessageFromFetchResponse(res));
      setCreate({ code: "", name: "", kgFactor: 1 });
      await refresh();
      setBanner("Unit created.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Could not create unit.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!edit) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/units/${edit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...edit, kgFactor: Number(edit.kgFactor) }),
      });
      if (!res.ok) throw new Error(await errorMessageFromFetchResponse(res));
      setEdit(null);
      await refresh();
      setBanner("Unit saved.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Could not save unit.");
    } finally {
      setBusy(false);
    }
  }

  async function removeUnit(row: UnitRow) {
    setBusy(true);
    try {
      const res = await fetch(`/api/units/${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await errorMessageFromFetchResponse(res));
      await refresh();
      setBanner("Unit removed (or deactivated if in use).");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Could not remove unit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr auto" }, gap: 1, mb: 2 }}>
        <TextField size="small" label="Code" value={create.code} onChange={(e) => setCreate((p) => ({ ...p, code: e.target.value }))} />
        <TextField size="small" label="Name" value={create.name} onChange={(e) => setCreate((p) => ({ ...p, name: e.target.value }))} />
        <TextField size="small" label="Kg factor" type="number" value={create.kgFactor} onChange={(e) => setCreate((p) => ({ ...p, kgFactor: Number(e.target.value) }))} />
        <Button variant="contained" disabled={busy || !create.code.trim() || !create.name.trim() || Number(create.kgFactor) <= 0} onClick={() => void createUnit()}>
          {busy ? <CircularProgress size={18} /> : "Add"}
        </Button>
      </Box>
      {banner ? <Alert sx={{ mb: 2 }} severity="info">{banner}</Alert> : null}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Code</TableCell>
            <TableCell>Name</TableCell>
            <TableCell align="right">Kg Factor</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.code}</TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell align="right">{Number(r.kgFactor).toFixed(3)}</TableCell>
              <TableCell><Chip size="small" label={r.isActive ? "Active" : "Inactive"} color={r.isActive ? "success" : "default"} /></TableCell>
              <TableCell align="right">
                <Button size="small" onClick={() => setEdit({ ...r })}>Edit</Button>
                <Button size="small" color="error" onClick={() => void removeUnit(r)}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {sorted.length === 0 ? (
            <TableRow><TableCell colSpan={5}><Typography color="text.secondary">No units found.</Typography></TableCell></TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog open={edit !== null} onClose={() => setEdit(null)} fullWidth maxWidth="xs">
        <DialogTitle>Edit unit</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px!important" }}>
          <TextField label="Code" value={edit?.code ?? ""} onChange={(e) => setEdit((p) => (p ? { ...p, code: e.target.value } : p))} />
          <TextField label="Name" value={edit?.name ?? ""} onChange={(e) => setEdit((p) => (p ? { ...p, name: e.target.value } : p))} />
          <TextField label="Kg factor" type="number" value={edit?.kgFactor ?? 1} onChange={(e) => setEdit((p) => (p ? { ...p, kgFactor: Number(e.target.value) } : p))} />
          <Button variant={edit?.isActive ? "outlined" : "contained"} onClick={() => setEdit((p) => (p ? { ...p, isActive: !p.isActive } : p))}>
            {edit?.isActive ? "Set Inactive" : "Set Active"}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveEdit()} disabled={busy || !edit || !edit.code.trim() || !edit.name.trim() || Number(edit.kgFactor) <= 0}>Save</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
