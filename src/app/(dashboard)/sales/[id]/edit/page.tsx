export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { Header } from "@/components/layout/Header";
import { SaleEditForm } from "@/components/sales/SaleEditForm";
import { prisma } from "@/lib/prisma";

export default async function SaleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saleId = Number(id);
  if (Number.isNaN(saleId)) notFound();

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { id: true, invoiceNo: true, saleDate: true, notes: true },
  });
  if (!sale) notFound();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Edit sale" />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 }, bgcolor: "grey.50" }}>
        <Container maxWidth="sm">
          <Stack spacing={2}>
            <Button component={Link} href={`/sales/${sale.id}`} prefetch startIcon={<ArrowBackIcon />} size="small" variant="text">
              Back to sale
            </Button>
            <SaleEditForm
              saleId={sale.id}
              invoiceNo={sale.invoiceNo}
              saleDateISO={sale.saleDate.toISOString()}
              notes={sale.notes ?? ""}
            />
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
