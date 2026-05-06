export const dynamic = "force-dynamic";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { BrandManagementPanel } from "@/components/products/BrandManagementPanel";

export default async function ProductBrandManagementPage() {
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Brand Management" />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">Create, update, deactivate, or delete brands.</Typography>
            <Link href="/products" style={{ textDecoration: "none" }}>
              <Button variant="outlined">Back to products</Button>
            </Link>
          </Box>
          <BrandManagementPanel initialBrands={brands.map((b) => ({ id: b.id, name: b.name, isActive: b.isActive }))} />
        </Container>
      </Box>
    </Box>
  );
}
