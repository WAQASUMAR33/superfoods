export const dynamic = "force-dynamic";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function PurchaseReturnsListPage() {
  const returns = await prisma.purchaseReturn.findMany({
    orderBy: { returnDate: "desc" },
    take: 100,
    include: { purchase: { select: { invoiceNo: true, internalRef: true } }, supplier: { select: { name: true } } },
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Purchase returns" />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              {returns.length} most recent purchase returns
            </Typography>
            <Link href="/purchases" prefetch style={{ textDecoration: "none" }}>
              <Button size="small" variant="outlined">
                Purchases
              </Button>
            </Link>
          </Box>

          <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
            <Table size="small">
              <TableHead sx={{ "& th": { fontWeight: 600, bgcolor: "action.hover", fontSize: 11 } }}>
                <TableRow>
                  <TableCell>Return no.</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Purchase</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {returns.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{r.returnNo}</TableCell>
                    <TableCell>{formatDateTime(r.returnDate)}</TableCell>
                    <TableCell>
                      {r.purchase.internalRef} · {r.purchase.invoiceNo}
                    </TableCell>
                    <TableCell>{r.supplier.name}</TableCell>
                    <TableCell align="right">{formatCurrency(r.totalAmount)}</TableCell>
                    <TableCell align="right">
                      <Link href={`/purchases/${r.purchaseId}`} prefetch style={{ textDecoration: "none" }}>
                        <Button size="small">View purchase</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {returns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                        No purchase returns yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>
    </Box>
  );
}
