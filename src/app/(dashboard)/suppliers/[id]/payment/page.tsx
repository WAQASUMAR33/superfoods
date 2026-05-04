export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { Header } from "@/components/layout/Header";
import { SupplierPaymentPanel, type OpenPurchaseRow } from "@/components/suppliers/SupplierPaymentPanel";
import { prisma } from "@/lib/prisma";

export default async function SupplierPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplierId = Number(id);
  if (Number.isNaN(supplierId)) notFound();

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true, name: true, code: true, openingBalance: true },
  });
  if (!supplier) notFound();

  const latestLedger = await prisma.partyLedgerEntry.findFirst({
    where: { supplierId },
    orderBy: { id: "desc" },
    select: { runningBalance: true },
  });
  const ledgerBalanceDue = latestLedger ? Number(latestLedger.runningBalance) : Number(supplier.openingBalance);

  const raw = await prisma.purchase.findMany({
    where: { supplierId, balanceDue: { gt: 0 } },
    orderBy: { purchaseDate: "asc" },
    select: {
      id: true,
      invoiceNo: true,
      internalRef: true,
      purchaseDate: true,
      totalAmount: true,
      paidAmount: true,
      balanceDue: true,
    },
  });

  const openPurchases: OpenPurchaseRow[] = raw.map((p) => ({
    id: p.id,
    invoiceNo: p.invoiceNo,
    internalRef: p.internalRef,
    purchaseDate: p.purchaseDate.toISOString(),
    totalAmount: Number(p.totalAmount),
    paidAmount: Number(p.paidAmount),
    balanceDue: Number(p.balanceDue),
  }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title={`Pay supplier · ${supplier.name}`} />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="sm">
          <Box sx={{ mb: 2 }}>
            <Link href={`/suppliers/${supplierId}`} style={{ textDecoration: "none", display: "inline-flex" }}>
              <Button component="span" startIcon={<ArrowBackIcon />} size="small">
                Back to supplier
              </Button>
            </Link>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Supplier {supplier.code} — payments are recorded against a purchase invoice with balance due.
          </Typography>
          <SupplierPaymentPanel
            supplierId={supplier.id}
            supplierName={supplier.name}
            ledgerBalanceDue={ledgerBalanceDue}
            openPurchases={openPurchases}
          />
        </Container>
      </Box>
    </Box>
  );
}
