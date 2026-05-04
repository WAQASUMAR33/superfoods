"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

import { errorMessageFromFetchResponse } from "@/lib/httpErrorMessage";
import { USER_ROLES, type UserRole } from "@/lib/roles";

export type UserRowPayload = {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date | string;
};

type Props = {
  initialUsers: UserRowPayload[];
  /** Logged-in user id — cannot delete yourself. */
  currentUserId?: number;
};

const ROLES = USER_ROLES;

function chipColor(role: string): "primary" | "warning" | "default" | "secondary" {
  switch (role) {
    case "ADMIN":
      return "primary";
    case "MANAGER":
      return "warning";
    default:
      return "secondary";
  }
}

export function UsersTable({ initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState<UserRowPayload[]>(initialUsers);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<UserRowPayload | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRowPayload | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [banner, setBanner] = useState<{ severity: "error" | "success"; msg: string } | null>(
    null
  );
  const [pendingId, setPendingId] = useState<number | null>(null);

  const merged = useMemo(() => [...users].sort((a, b) => a.username.localeCompare(b.username)), [users]);
  const soleAdmin = useMemo(() => users.filter((u) => u.role === "ADMIN").length <= 1, [users]);

  function pushBanner(severity: "error" | "success", msg: string) {
    setBanner({ severity, msg });
  }

  async function refreshList() {
    const res = await fetch("/api/users");
    const data = (await res.json()) as UserRowPayload[] | { error?: string };
    if (!res.ok || !Array.isArray(data)) {
      pushBanner("error", (data && typeof data === "object" && "error" in data && data.error?.toString()) || "Could not reload users.");
      return;
    }
    setUsers(data.map((u) => ({ ...u })));
  }

  function canDeleteUser(row: UserRowPayload): boolean {
    if (currentUserId !== undefined && row.id === currentUserId) return false;
    if (row.role === "ADMIN" && soleAdmin) return false;
    return true;
  }

  async function confirmDeleteUser() {
    if (!userToDelete) return;
    setDeleteBusy(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        pushBanner("error", await errorMessageFromFetchResponse(res));
        return;
      }
      pushBanner("success", `User "${userToDelete.username}" was removed.`);
      setUserToDelete(null);
      await refreshList();
    } finally {
      setDeleteBusy(false);
    }
  }

  async function toggleActive(row: UserRowPayload, next: boolean) {
    setPendingId(row.id);
    try {
      const res = await fetch(`/api/users/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: row.fullName,
          email: row.email ?? "",
          role: row.role,
          isActive: next,
          password: "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushBanner("error", data?.error?.toString() || res.statusText);
        return;
      }
      pushBanner("success", next ? "User activated." : "User deactivated.");
      setUsers((prev) => prev.map((u) => (u.id === row.id ? { ...u, isActive: data.isActive } : u)));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Paper elevation={1} sx={{ mt: 2, overflow: "hidden" }}>
      <Box sx={{ px: 2, py: 2, borderBottom: 1, borderColor: "divider", display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 1 }}>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setAddOpen(true)}>
          Add user
        </Button>
      </Box>

      {banner && (
        <Alert severity={banner.severity} onClose={() => setBanner(null)} sx={{ m: 2 }}>
          {banner.msg}
        </Alert>
      )}

      <TableContainer>
        <Table size="medium">
          <TableHead sx={{ "& th": { fontWeight: 600, bgcolor: "action.hover", whiteSpace: "nowrap" } }}>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Full name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="center">Active</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {merged.map((row) => (
              <TableRow key={row.id} hover sx={{ "& td": { verticalAlign: "middle" } }}>
                <TableCell>{row.username}</TableCell>
                <TableCell>{row.fullName}</TableCell>
                <TableCell>{row.email ?? "—"}</TableCell>
                <TableCell>
                  <Chip size="small" label={row.role} color={chipColor(row.role)} variant="filled" />
                </TableCell>
                <TableCell align="center">
                  {pendingId === row.id ? (
                    <CircularProgress size={22} sx={{ mr: 0.5, verticalAlign: "middle" }} />
                  ) : (
                    <Switch
                      size="small"
                      checked={row.isActive}
                      onChange={(e) => void toggleActive(row, e.target.checked)}
                      disabled={pendingId !== null}
                    />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "inline-flex", flexWrap: "wrap", gap: 0.5, justifyContent: "flex-end" }}>
                    <Button size="small" startIcon={<EditIcon />} variant="text" onClick={() => setEditRow(row)}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="text"
                      startIcon={<DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />}
                      disabled={!canDeleteUser(row) || deleteBusy || pendingId !== null}
                      onClick={() => setUserToDelete(row)}
                    >
                      Remove
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={async () => {
          pushBanner("success", "User created.");
          await refreshList();
          setAddOpen(false);
        }}
        onError={(msg) => pushBanner("error", msg)}
      />

      <EditUserDialog
        row={editRow}
        onClose={() => setEditRow(null)}
        onSaved={async () => {
          pushBanner("success", "Saved.");
          setEditRow(null);
          await refreshList();
        }}
        onError={(msg) => pushBanner("error", msg)}
      />

      <Dialog open={userToDelete !== null} onClose={() => !deleteBusy && setUserToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove user?</DialogTitle>
        <DialogContent>
          {userToDelete ? (
            <Typography variant="body2" color="text.secondary">
              This permanently deletes <strong>{userToDelete.username}</strong> ({userToDelete.fullName}). Users linked to
              sales, purchases, or stock adjustments cannot be removed — deactivate them instead.
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setUserToDelete(null)} disabled={deleteBusy}>
            Cancel
          </Button>
          <Button color="error" variant="contained" disabled={deleteBusy} onClick={() => void confirmDeleteUser()}>
            {deleteBusy ? <CircularProgress size={20} color="inherit" /> : "Remove user"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function AddUserDialog({
  open,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("CASHIER");
  const [saving, setSaving] = useState(false);

  function reset() {
    setUsername("");
    setPassword("");
    setFullName("");
    setEmail("");
    setRole("CASHIER");
  }

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          fullName: fullName.trim(),
          email: email.trim(),
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(typeof data?.error === "string" ? data.error : JSON.stringify(data?.error ?? res.statusText));
        return;
      }
      reset();
      await onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>Add user</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px!important" }}>
        <TextField label="Username" required value={username} onChange={(e) => setUsername(e.target.value)} autoFocus disabled={saving} />
        <TextField label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} helperText="At least 6 characters" disabled={saving} />
        <TextField label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={saving} />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={saving} />
        <FormControl fullWidth disabled={saving}>
          <InputLabel>Role</InputLabel>
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary">
          Role controls what this user can do in the app (ADMIN: full access; MANAGER: typical back-office;
          CASHIER: POS and daily operations).
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()} disabled={saving}>Cancel</Button>
        <Button variant="contained" disabled={saving || !username.trim() || password.length < 6 || !fullName.trim()} onClick={() => void submit()}>
          {saving ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function parseRole(role: string): UserRole {
  return USER_ROLES.includes(role as UserRole) ? (role as UserRole) : "CASHIER";
}

function EditUserDialog({
  row,
  onClose,
  onSaved,
  onError,
}: {
  row: UserRowPayload | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("CASHIER");
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    setFullName(row.fullName);
    setEmail(row.email ?? "");
    setRole(parseRole(row.role));
    setActive(row.isActive);
    setPassword("");
  }, [row]);

  async function submit() {
    setSaving(true);
    try {
      if (!row) return;
      const res = await fetch(`/api/users/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          role,
          isActive: active,
          password: password.trim() ? password : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(typeof data?.error === "string" ? data.error : JSON.stringify(data?.error ?? res.statusText));
        return;
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={row !== null} onClose={() => !saving && onClose()} fullWidth maxWidth="sm">
      {row && (
        <>
          <DialogTitle>Edit {row.username}</DialogTitle>
          <DialogContent
            dividers
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px!important" }}
          >
            <TextField disabled value={row.username} label="Username" helperText="Cannot be changed here" />
            <TextField
              label="Full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
            />
            <FormControl fullWidth disabled={saving}>
              <InputLabel>Role</InputLabel>
              <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Checkbox checked={active} onChange={(e) => setActive(e.target.checked)} />}
              label="Active"
              disabled={saving}
            />
            <TextField
              label="New password (optional)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Leave blank to keep current password. Min 6 characters if set."
              disabled={saving}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => onClose()} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={saving || !fullName.trim() || (!!password && password.length < 6)}
              onClick={() => void submit()}
            >
              Save
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
