"use client";

import { useEffect } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string; code?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route error:", error);
  }, [error]);

  const detail = typeof error.message === "string" ? error.message : "";
  const isPool =
    detail.includes("connection pool") ||
    detail.includes("P2024") ||
    detail.includes("Timed out fetching") ||
    error.code === "P2024";

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8 } }}>
      <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: "divider" }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          This page couldn&apos;t load
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {isPool
            ? "The database connection pool timed out or is exhausted. Wait a moment and try again, or raise connection_limit and pool_timeout on your DATABASE_URL if this keeps happening."
            : "Something went wrong while loading this screen. You can try again or go back to the dashboard."}
        </Typography>
        {process.env.NODE_ENV === "development" && detail ? (
          <Typography
            component="pre"
            variant="caption"
            sx={{
              display: "block",
              mb: 2,
              maxHeight: 160,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              color: "error.main",
              fontFamily: "monospace",
            }}
          >
            {detail}
          </Typography>
        ) : null}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          <Button variant="contained" onClick={() => reset()}>
            Try again
          </Button>
          <Button component={Link} href="/dashboard" variant="outlined">
            Dashboard
          </Button>
        </Box>
        {error.digest ? (
          <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 2 }}>
            Reference: {error.digest}
          </Typography>
        ) : null}
      </Paper>
    </Container>
  );
}
