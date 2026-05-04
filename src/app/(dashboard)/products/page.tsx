export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";

import { Header } from "@/components/layout/Header";
import { UrlSyncedFilters } from "@/components/mui/UrlSyncedFilters";
import { prisma } from "@/lib/prisma";
import { getStockLevels } from "@/lib/inventory";
import { interactiveTransactionOptions } from "@/lib/interactiveTransaction";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ProductDeleteButton } from "@/components/products/ProductDeleteButton";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; brandId?: string; stock?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const brandId = params.brandId ? Number(params.brandId) : undefined;
  const stockFilter = params.stock?.trim() ?? "";

  const { brands, products, stockLevels } = await prisma.$transaction(
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
        orderBy: [{ name: "asc" }],
      });
      const stockLevels = await getStockLevels(tx);
      return { brands, products, stockLevels };
    },
    interactiveTransactionOptions
  );

  const rows = products
    .map((p) => {
      const stock = stockLevels[p.id] ?? 0;
      const threshold = Number(p.lowStockThresholdKg);
      const statusVariant = stock <= 0 ? "critical" : stock <= threshold ? "low" : "ok";
      const statusLabel = stock <= 0 ? "Out of Stock" : stock <= threshold ? "Low Stock" : "In Stock";
      return { p, stock, threshold, statusVariant, statusLabel };
    })
    .filter((r) => {
      if (!stockFilter) return true;
      if (stockFilter === "ok") return r.statusVariant === "ok";
      if (stockFilter === "low") return r.statusVariant === "low";
      if (stockFilter === "out") return r.statusVariant === "critical";
      return true;
    });

  const brandOptions = brands.map((b) => ({ value: String(b.id), label: b.name }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Products" />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="xl">
          <Box
            sx={{
              mb: 2,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {rows.length} product{rows.length === 1 ? "" : "s"} (filtered)
            </Typography>
            <Link href="/products/new" prefetch style={{ textDecoration: "none" }}>
              <Button variant="contained" startIcon={<AddIcon />}>
                Add Product
              </Button>
            </Link>
          </Box>

          <Suspense fallback={<Box sx={{ height: 96, mb: 2 }} />}>
            <UrlSyncedFilters
              fields={[
                { key: "q", type: "text", label: "Search", placeholder: "Name or code" },
                {
                  key: "brandId",
                  type: "select",
                  label: "Brand",
                  emptyLabel: "All brands",
                  options: brandOptions,
                },
                {
                  key: "stock",
                  type: "select",
                  label: "Stock level",
                  emptyLabel: "All",
                  options: [
                    { value: "ok", label: "In stock" },
                    { value: "low", label: "Low stock" },
                    { value: "out", label: "Out of stock" },
                  ],
                },
              ]}
            />
          </Suspense>

          <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
            <Table size="small" sx={{ "& .MuiTableCell-root": { py: 1.5 } }}>
              <TableHead sx={{ "& th": { fontWeight: 600, bgcolor: "action.hover", color: "text.secondary", fontSize: 11 } }}>
                <TableRow>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Brand</TableCell>
                  <TableCell align="right">Sale / Kg</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }} align="right">
                    Stock (Kg)
                  </TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" width={220} />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(({ p, stock, statusLabel, statusVariant }) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, fontFamily: "monospace", fontSize: 12 }} color="text.secondary">
                      {p.code}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {p.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }} color="text.secondary">
                      {p.brand?.name ?? "—"}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(p.salePrice)}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }} align="right">
                      {formatNumber(stock, 2)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabel}
                        color={
                          statusVariant === "critical" ? "error" : statusVariant === "low" ? "warning" : "success"
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: "inline-flex", flexWrap: "wrap", gap: 1, justifyContent: "flex-end" }}>
                        <Link href={`/products/${p.id}`} prefetch style={{ textDecoration: "none" }}>
                          <Button size="small" startIcon={<EditIcon sx={{ fontSize: 18 }} />}>
                            Edit
                          </Button>
                        </Link>
                        <ProductDeleteButton productId={p.id} productName={p.name} />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                        No products match your filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>
    </Box>
  );
}
