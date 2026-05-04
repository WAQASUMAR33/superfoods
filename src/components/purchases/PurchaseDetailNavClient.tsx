"use client";

import Link from "next/link";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Button from "@mui/material/Button";
import MuiLink from "@mui/material/Link";

export function PurchaseHistoryBackButton() {
  return (
    <Button component={Link} href="/purchases" prefetch startIcon={<ArrowBackIcon />} size="small" variant="text">
      Purchases
    </Button>
  );
}

export function SupplierProfileLink({ supplierId, name }: { supplierId: number; name: string }) {
  return (
    <MuiLink
      component={Link}
      href={`/suppliers/${supplierId}`}
      prefetch
      underline="hover"
      sx={{ fontWeight: 700, fontSize: "1.05rem", color: "text.primary" }}
    >
      {name}
    </MuiLink>
  );
}
