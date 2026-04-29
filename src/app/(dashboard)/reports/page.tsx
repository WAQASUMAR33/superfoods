export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import BarChartIcon from "@mui/icons-material/BarChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PaymentsIcon from "@mui/icons-material/Payments";

import { Header } from "@/components/layout/Header";
import { UrlSyncedFilters } from "@/components/mui/UrlSyncedFilters";
import { ReportDocumentHeader } from "@/components/reports/ReportDocumentHeader";
import { ReportExportBar } from "@/components/reports/ReportExportBar";
import { rowsToCsv } from "@/lib/csv";
import { getReportBusinessInfo, formatReportItalianDate } from "@/lib/reportBusiness";

const reports = [
  {
    href: "/reports/sales",
    Icon: BarChartIcon,
    label: "Sales Report",
    desc: "Daily, weekly, monthly summaries by product or customer",
    tint: "#1976d2",
  },
  {
    href: "/reports/purchases",
    Icon: TrendingUpIcon,
    label: "Purchase Report",
    desc: "Procurement costs and supplier trends",
    tint: "#7b1fa2",
  },
  {
    href: "/reports/stock",
    Icon: Inventory2Icon,
    label: "Stock Valuation",
    desc: "Current inventory value at weighted average cost",
    tint: "#2e7d32",
  },
  {
    href: "/reports/ledger",
    Icon: MenuBookIcon,
    label: "Ledger Report",
    desc: "Statement of accounts for any customer or supplier",
    tint: "#ed6c02",
  },
  {
    href: "/reports/profit-loss",
    Icon: PaymentsIcon,
    label: "Profit & Loss",
    desc: "Income statement for selected period",
    tint: "#c62828",
  },
];

export default async function ReportsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const fq = params.q?.trim().toLowerCase() ?? "";
  const company = await getReportBusinessInfo();
  const issued = new Date();

  const filtered = reports.filter((r) => {
    if (!fq) return true;
    return (
      r.label.toLowerCase().includes(fq) ||
      r.desc.toLowerCase().includes(fq) ||
      r.href.replace("/reports/", "").toLowerCase().includes(fq)
    );
  });

  const hubCsv = rowsToCsv(
    ["Report name", "Description", "Route"],
    filtered.map((r) => [r.label, r.desc, r.href])
  );
  const indexStem = `reports-index-${issued.toISOString().slice(0, 10)}`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Reports" />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="lg">
          <Suspense fallback={<Box sx={{ height: 96, mb: 2 }} />}>
            <Box className="print:hidden" sx={{ mb: 2 }}>
              <UrlSyncedFilters
                resetKeys={["q"]}
                fields={[
                  {
                    key: "q",
                    type: "text",
                    label: "Filter reports",
                    placeholder: "Name or keywords…",
                    sx: { width: { xs: "100%", sm: 340 } },
                  },
                ]}
              />
            </Box>
          </Suspense>

          <ReportExportBar filenameStem={indexStem} csv={hubCsv}>
            <ReportDocumentHeader
              company={company}
              docLabel="Report index nr."
              docNumber="—"
              docDateText={formatReportItalianDate(issued)}
              bannerLeft="Available reports"
              bannerRight="Generation date"
            />

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              Showing {filtered.length} of {reports.length} reports
            </Typography>

            <Stack spacing={2}>
              {filtered.map((r) => {
                const Icon = r.Icon;
                return (
                  <Link
                    key={r.href}
                    href={r.href}
                    prefetch
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                  >
                    <Card
                      variant="outlined"
                      sx={{
                        transition:
                          "box-shadow 0.15s ease, border-color 0.15s ease, border-width 0.15s ease",
                        "&:hover": {
                          boxShadow: "0 1px 8px rgba(15,23,42,0.08)",
                          borderColor: "#94a3b8",
                        },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                          <Box
                            sx={{
                              p: 1.5,
                              bgcolor: `${r.tint}18`,
                              color: r.tint,
                              display: "flex",
                            }}
                          >
                            <Icon />
                          </Box>
                          <Box>
                            <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 700 }}>
                              {r.label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {r.desc}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </Stack>

            {filtered.length === 0 && (
              <Typography sx={{ mt: 4, textAlign: "center", color: "text.secondary" }}>
                No reports match your search.
              </Typography>
            )}
          </ReportExportBar>
        </Container>
      </Box>
    </Box>
  );
}
