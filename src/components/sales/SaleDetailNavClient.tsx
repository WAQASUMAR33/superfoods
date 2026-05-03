"use client";

import Link from "next/link";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Button from "@mui/material/Button";
import MuiLink from "@mui/material/Link";

export function SaleHistoryBackButton() {
  return (
    <Button component={Link} href="/sales" prefetch startIcon={<ArrowBackIcon />} size="small" variant="text">
      Sales history
    </Button>
  );
}

export function CustomerProfileLink({ customerId, name }: { customerId: number; name: string }) {
  return (
    <MuiLink
      component={Link}
      href={`/customers/${customerId}`}
      prefetch
      underline="hover"
      sx={{ fontWeight: 700, fontSize: "1.05rem", color: "text.primary" }}
    >
      {name}
    </MuiLink>
  );
}
