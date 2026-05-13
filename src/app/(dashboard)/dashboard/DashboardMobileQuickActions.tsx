"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import PaymentsIcon from "@mui/icons-material/Payments";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";

export function DashboardMobileQuickActions() {
  return (
    <Box
      component="nav"
      aria-label="Quick actions"
      sx={{
        display: { xs: "flex", md: "none" },
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        gap: 1.5,
        px: 2,
        pt: 1.5,
        pb: (theme) => `max(${theme.spacing(2)}, env(safe-area-inset-bottom, 0px))`,
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
        boxShadow: 6,
      }}
    >
      <Button
        component={Link}
        href="/customers/receiving"
        prefetch
        variant="contained"
        color="success"
        size="large"
        startIcon={<PaymentsIcon />}
        sx={{ flex: 1, minWidth: 0 }}
      >
        Receive
      </Button>
      <Button
        component={Link}
        href="/pos"
        prefetch
        variant="contained"
        size="large"
        startIcon={<PointOfSaleIcon />}
        sx={{ flex: 1, minWidth: 0 }}
      >
        POS
      </Button>
    </Box>
  );
}
