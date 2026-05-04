"use client";

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import Alert from "@mui/material/Alert";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import SearchIcon from "@mui/icons-material/Search";

import { BRAND_DISPLAY_NAME } from "@/config/branding";
import { APP_CURRENCY } from "@/config/locale";
import { Header } from "@/components/layout/Header";

interface Settings {
  businessName: string;
  address: string;
  phone: string;
  ntnNumber: string;
  currency: string;
  invoicePrefix: string;
  purchasePrefix: string;
  lowStockDefaultKg: number;
}

const DEFAULTS: Settings = {
  businessName: BRAND_DISPLAY_NAME,
  address: "",
  phone: "",
  ntnNumber: "",
  currency: APP_CURRENCY,
  invoicePrefix: "INV",
  purchasePrefix: "PUR",
  lowStockDefaultKg: 200,
};

export default function SettingsPage() {
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) =>
        setForm({
          businessName: data.businessName ?? DEFAULTS.businessName,
          address: data.address ?? "",
          phone: data.phone ?? "",
          ntnNumber: data.ntnNumber ?? "",
          currency: data.currency ?? APP_CURRENCY,
          invoicePrefix: data.invoicePrefix ?? "INV",
          purchasePrefix: data.purchasePrefix ?? "PUR",
          lowStockDefaultKg: Number(data.lowStockDefaultKg ?? 200),
        })
      )
      .catch(() => {});
  }, []);

  function set(field: keyof Settings, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lowStockDefaultKg: Number(form.lowStockDefaultKg) }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "Failed to save settings");
    }
  }

  const fq = filter.trim().toLowerCase();
  const showAll = fq.length === 0;
  function match(...parts: string[]) {
    if (showAll) return true;
    const blob = parts.join(" ").toLowerCase();
    return parts.some((p) => p.toLowerCase().includes(fq)) || blob.includes(fq);
  }

  const sectionVisible = {
    biz: match("Business", form.businessName, form.phone, form.address, form.ntnNumber, "business", "company"),
    invoice: match("invoice", form.currency, form.invoicePrefix, form.purchasePrefix, "currency", "prefix", "purchase"),
    inv: match("inventory", "stock", "low", String(form.lowStockDefaultKg)),
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
      <Header title="Settings" />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="sm">
          <TextField
            fullWidth
            size="small"
            placeholder="Find a setting section or field..."
            label="Search settings"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            sx={{ mb: 3 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <form onSubmit={handleSubmit}>
            {sectionVisible.biz && (
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
                    Business information
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
                    <TextField
                      label="Business name"
                      required
                      fullWidth
                      value={form.businessName}
                      onChange={(e) => set("businessName", e.target.value)}
                    />
                    <TextField label="Phone" fullWidth placeholder="03XX-XXXXXXX" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                    <TextField label="NTN number" fullWidth placeholder="0000000-0" value={form.ntnNumber} onChange={(e) => set("ntnNumber", e.target.value)} />
                    <TextField label="Address" fullWidth multiline minRows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
                  </Box>
                </CardContent>
              </Card>
            )}

            {sectionVisible.invoice && (
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
                    Invoice defaults
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
                    <TextField label="Currency" fullWidth placeholder="EUR" value={form.currency} onChange={(e) => set("currency", e.target.value)} />
                    <TextField
                      label="Invoice prefix"
                      required
                      fullWidth
                      placeholder="INV"
                      value={form.invoicePrefix}
                      onChange={(e) => set("invoicePrefix", e.target.value)}
                    />
                    <TextField
                      label="Purchase prefix"
                      required
                      fullWidth
                      placeholder="PUR"
                      value={form.purchasePrefix}
                      onChange={(e) => set("purchasePrefix", e.target.value)}
                    />
                  </Box>
                </CardContent>
              </Card>
            )}

            {sectionVisible.inv && (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
                    Inventory defaults
                  </Typography>
                  <TextField
                    label="Low stock alert (Kg)"
                    type="number"
                    required
                    fullWidth
                    slotProps={{ htmlInput: { min: 0, step: 1 } }}
                    sx={{ mt: 1 }}
                    value={form.lowStockDefaultKg}
                    onChange={(e) => set("lowStockDefaultKg", Number(e.target.value))}
                  />
                </CardContent>
              </Card>
            )}

            {filter.trim() !== "" && !sectionVisible.biz && !sectionVisible.invoice && !sectionVisible.inv && (
              <Typography sx={{ mb: 2, textAlign: "center", color: "text.secondary" }}>
                Nothing matches «{filter}». Clear the search box to show all sections.
              </Typography>
            )}

            {error !== "" && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2 }}>
              {saved && (
                <Typography variant="body2" color="success.main" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <CheckCircleIcon fontSize="small" /> Saved
                </Typography>
              )}
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? "Saving…" : "Save settings"}
              </Button>
            </Box>
          </form>
        </Container>
      </Box>
    </Box>
  );
}
