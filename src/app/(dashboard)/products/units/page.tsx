export const dynamic = "force-dynamic";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { UnitManagementPanel } from "@/components/products/UnitManagementPanel";

export default async function ProductUnitManagementPage() {
  const units = await prisma.unitDefinition.findMany({ orderBy: { code: "asc" } });
  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Unit Management" />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">Manage product units and kg conversion factors.</Typography>
            <Link href="/products" style={{ textDecoration: "none" }}>
              <Button variant="outlined">Back to products</Button>
            </Link>
          </Box>
          <UnitManagementPanel
            initialUnits={units.map((u) => ({
              id: u.id,
              code: u.code,
              name: u.name,
              kgFactor: Number(u.kgFactor),
              isActive: u.isActive,
            }))}
          />
        </Container>
      </Box>
    </Box>
  );
}
