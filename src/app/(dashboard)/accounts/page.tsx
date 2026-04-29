export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";

import { Header } from "@/components/layout/Header";
import { UrlSyncedFilters } from "@/components/mui/UrlSyncedFilters";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

const TYPE_ORDER = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const;
const TYPE_COLORS: Record<string, "default" | "primary" | "secondary" | "error" | "success" | "warning" | "info"> = {
  ASSET: "primary",
  LIABILITY: "error",
  EQUITY: "secondary",
  INCOME: "success",
  EXPENSE: "warning",
};

async function getAccountsWithBalances() {
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { code: "asc" }],
    include: { lines: { select: { type: true, amount: true } } },
  });

  return accounts.map((a) => {
    let balance = 0;
    for (const l of a.lines) {
      const amt = Number(l.amount);
      if (l.type === "DEBIT") {
        balance += ["ASSET", "EXPENSE"].includes(a.type) ? amt : -amt;
      } else {
        balance += ["LIABILITY", "EQUITY", "INCOME"].includes(a.type) ? amt : -amt;
      }
    }
    return { ...a, balance, txCount: a.lines.length };
  });
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const typeFilter = params.type?.trim();

  const all = await getAccountsWithBalances();

  let accounts = all;
  if (typeFilter && TYPE_ORDER.includes(typeFilter as (typeof TYPE_ORDER)[number])) {
    accounts = accounts.filter((a) => a.type === typeFilter);
  }
  if (q) {
    const lower = q.toLowerCase();
    accounts = accounts.filter(
      (a) => a.code.toLowerCase().includes(lower) || a.name.toLowerCase().includes(lower)
    );
  }

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    accounts: accounts.filter((a) => a.type === type),
  })).filter((g) => g.accounts.length > 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Chart of Accounts" />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="xl">
          <Box
            sx={{
              mb: 2,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {accounts.length} accounts shown
            </Typography>
            <Link href="/accounts/new" prefetch style={{ textDecoration: "none" }}>
              <Button variant="contained" startIcon={<AddIcon />}>
                Add Account
              </Button>
            </Link>
          </Box>

          <Suspense fallback={<Box sx={{ height: 96, mb: 2 }} />}>
            <UrlSyncedFilters
              fields={[
                { key: "q", type: "text", label: "Search", placeholder: "Code or name…" },
                {
                  key: "type",
                  type: "select",
                  label: "Type",
                  emptyLabel: "All types",
                  options: [...TYPE_ORDER].map((t) => ({
                    value: t,
                    label: t.charAt(0) + t.slice(1).toLowerCase(),
                  })),
                },
              ]}
            />
          </Suspense>

          <StackSections grouped={grouped} />
          {accounts.length === 0 && (
            <Typography sx={{ py: 8, textAlign: "center", color: "text.secondary" }}>
              No accounts match your filters.
            </Typography>
          )}
        </Container>
      </Box>
    </Box>
  );
}

type AccountRow = Awaited<ReturnType<typeof getAccountsWithBalances>>[number];

function StackSections({
  grouped,
}: {
  grouped: { type: string; accounts: AccountRow[] }[];
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {grouped.map(({ type, accounts: accs }) => (
        <Paper key={type} sx={{ overflow: "hidden", boxShadow: 1 }}>
          <Box sx={{ px: 2.5, py: 2, bgcolor: "action.hover", display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Chip size="small" label={type} color={TYPE_COLORS[type] ?? "default"} variant={TYPE_COLORS[type] ? "filled" : "outlined"} />
            <Typography variant="body2" color="text.secondary">
              {accs.length} accounts
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small" sx={{ "& .MuiTableCell-root": { py: 1.5 } }}>
              <TableHead sx={{ "& th": { fontWeight: 700, fontSize: 11, color: "text.secondary", bgcolor: "background.default" } }}>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Account Name</TableCell>
                  <TableCell align="center">Transactions</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accs.map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }} color="text.secondary">
                      {a.code}
                    </TableCell>
                    <TableCell>
                      <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                        {a.name}
                      </Typography>
                      {a.isSystem && (
                        <Chip label="system" size="small" sx={{ ml: 1, height: 20, fontSize: 10 }} variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="center">{a.txCount}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: a.balance < 0 ? "error.main" : "text.primary" }}>
                      {formatCurrency(Math.abs(a.balance))}
                      {a.balance < 0 && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {" "}
                          CR
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}
    </Box>
  );
}
