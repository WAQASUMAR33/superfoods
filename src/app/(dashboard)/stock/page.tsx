export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import PackageIcon from "@mui/icons-material/Inventory2";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DangerousOutlinedIcon from "@mui/icons-material/DangerousOutlined";

import { Header } from "@/components/layout/Header";
import { UrlSyncedFilters } from "@/components/mui/UrlSyncedFilters";
import { prisma } from "@/lib/prisma";
import { getStockLevels, getStockStatus } from "@/lib/inventory";
import { interactiveTransactionOptions } from "@/lib/interactiveTransaction";
import { formatNumber } from "@/lib/utils";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; brandId?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const brandId = params.brandId ? Number(params.brandId) : undefined;
  const statusFilter = params.status?.trim() ?? "";

  const { products, brands, stockLevels } = await prisma.$transaction(
    async (tx) => {
      const brands = await tx.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
      const products = await tx.product.findMany({
        where: {
          isActive: true,
          ...(q
            ? {
                OR: [{ name: { contains: q } }, { code: { contains: q } }],
              }
            : {}),
          ...(brandId && !Number.isNaN(brandId) ? { brandId } : {}),
        },
        include: { brand: true },
        orderBy: { name: "asc" },
      });
      const stockLevels = await getStockLevels(tx);
      return { products, brands, stockLevels };
    },
    interactiveTransactionOptions
  );

  let rows = products.map((p) => {
    const stockKg = stockLevels[p.id] ?? 0;
    const threshold = Number(p.lowStockThresholdKg);
    const status = getStockStatus(stockKg, threshold);
    return { ...p, stockKg, threshold, status };
  });

  if (statusFilter) {
    rows = rows.filter((r) => {
      if (statusFilter === "ok") return r.status === "ok";
      if (statusFilter === "low") return r.status === "low";
      if (statusFilter === "critical") return r.status === "critical";
      return true;
    });
  }

  const summary = {
    total: rows.length,
    ok: rows.filter((r) => r.status === "ok").length,
    low: rows.filter((r) => r.status === "low").length,
    critical: rows.filter((r) => r.status === "critical").length,
  };

  const brandOptions = brands.map((b) => ({ value: String(b.id), label: b.name }));

  const cardItems = [
    { label: "Total (filtered)", value: summary.total, icon: PackageIcon, tone: "#0099D6" },
    { label: "In Stock", value: summary.ok, icon: CheckCircleIcon, tone: "#16a34a" },
    { label: "Low Stock", value: summary.low, icon: WarningAmberIcon, tone: "#d97706" },
    { label: "Out of Stock", value: summary.critical, icon: DangerousOutlinedIcon, tone: "#dc2626" },
  ];

  const statusBadge = (s: "ok" | "low" | "critical") => {
    if (s === "ok")
      return (
        <Tooltip title="Above threshold">
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "success.main", fontWeight: 600 }}>
            <CheckCircleIcon sx={{ fontSize: 18 }} /> OK
          </Box>
        </Tooltip>
      );
    if (s === "low")
      return (
        <Tooltip title="At or below reorder level">
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "warning.main", fontWeight: 600 }}>
            <WarningAmberIcon sx={{ fontSize: 18 }} /> Low
          </Box>
        </Tooltip>
      );
    return (
      <Tooltip title="Zero or negative on hand">
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "error.main", fontWeight: 600 }}>
          <DangerousOutlinedIcon sx={{ fontSize: 18 }} /> Out
        </Box>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Stock Levels" />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="xl">
          <Box
            sx={{
              mb: 3,
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
              gap: 2,
            }}
          >
            {cardItems.map(({ label, value, icon: Icon, tone }) => (
              <Card key={label} elevation={1}>
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2.25 }}>
                  <Box
                    sx={{
                      p: 1.25,
                      bgcolor: `${tone}14`,
                      color: tone,
                      display: "flex",
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="h5" component="div" sx={{ fontWeight: 800 }}>
                      {value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Suspense fallback={<Box sx={{ height: 96, mb: 2 }} />}>
            <UrlSyncedFilters
              fields={[
                { key: "q", type: "text", label: "Search", placeholder: "Product name or code…" },
                {
                  key: "brandId",
                  type: "select",
                  label: "Brand",
                  emptyLabel: "All brands",
                  options: brandOptions,
                },
                {
                  key: "status",
                  type: "select",
                  label: "Status",
                  emptyLabel: "All",
                  options: [
                    { value: "ok", label: "In stock" },
                    { value: "low", label: "Low" },
                    { value: "critical", label: "Out of stock" },
                  ],
                },
              ]}
            />
          </Suspense>

          <Paper sx={{ overflow: "hidden", boxShadow: 1 }}>
            <Box sx={{ px: 2, py: 1.75, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                All Products
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small" sx={{ "& .MuiTableCell-root": { py: 1.75 } }}>
                <TableHead sx={{ "& th": { fontWeight: 700, bgcolor: "action.hover", color: "text.secondary", fontSize: 11 } }}>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Brand</TableCell>
                    <TableCell align="right">Stock (Kg)</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }} align="right">
                      Threshold (Kg)
                    </TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {row.name}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: "monospace" }} color="text.secondary">
                          {row.code}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }} color="text.secondary">
                        {row.brand?.name ?? "—"}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatNumber(row.stockKg, 1)}
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }} align="right" color="text.secondary">
                        {formatNumber(row.threshold, 0)}
                      </TableCell>
                      <TableCell align="center">{statusBadge(row.status)}</TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
                          No rows match your filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
