export const dynamic = "force-dynamic";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { Header } from "@/components/layout/Header";
import Alert from "@mui/material/Alert";
import { UnitManagementPanel } from "@/components/products/UnitManagementPanel";
import { getActiveUnitsOrFallback } from "@/lib/unitDefinitions";

export default async function ProductUnitManagementPage() {
  const units = await getActiveUnitsOrFallback();
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
          <Alert severity="info" sx={{ mb: 2 }}>
            If you cannot create/edit/delete units, run database migration on this environment.
          </Alert>
          <UnitManagementPanel
            initialUnits={units.map((u) => ({
              id: u.id,
              code: u.code,
              name: u.name,
              kgFactor: u.kgFactor,
              isActive: u.isActive,
            }))}
          />
        </Container>
      </Box>
    </Box>
  );
}
