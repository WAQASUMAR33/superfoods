export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { Header } from "@/components/layout/Header";
import { CustomerReceivingPanel } from "@/components/customers/CustomerReceivingPanel";
import { prisma } from "@/lib/prisma";

export default async function CustomerReceivingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = Number(id);
  if (Number.isNaN(customerId)) notFound();

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, code: true, openingBalance: true },
  });
  if (!customer) notFound();

  const latestLedger = await prisma.partyLedgerEntry.findFirst({
    where: { customerId },
    orderBy: { id: "desc" },
    select: { runningBalance: true },
  });
  const ledgerBalanceDue = latestLedger ? Number(latestLedger.runningBalance) : Number(customer.openingBalance);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title={`General receipt · ${customer.name}`} />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="sm">
          <Box sx={{ mb: 2 }}>
            <Link href={`/customers/${customerId}`} style={{ textDecoration: "none", display: "inline-flex" }}>
              <Button component="span" startIcon={<ArrowBackIcon />} size="small">
                Back to customer
              </Button>
            </Link>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Customer {customer.code} — receipts are posted against the customer account (party ledger + AR). They are not
            matched to invoice numbers.
          </Typography>
          <CustomerReceivingPanel customerId={customer.id} customerName={customer.name} ledgerBalanceDue={ledgerBalanceDue} />
        </Container>
      </Box>
    </Box>
  );
}
