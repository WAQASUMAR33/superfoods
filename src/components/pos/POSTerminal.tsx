"use client";

import { useEffect, useState, useRef } from "react";
import { Search, X, Plus, Minus, Printer, Check, Share2 } from "lucide-react";
import { toPng } from "html-to-image";
import { useCart } from "@/hooks/useCart";
import { Unit, formatDisplay } from "@/lib/units";
import { formatCurrency } from "@/lib/utils";
import { ReceiptSale, SaleReceipt } from "./SaleReceipt";

interface Product {
  id: number;
  code: string;
  name: string;
  defaultUnit: string;
  salePrice: number;
  stockKg: number;
  lowStockThresholdKg: number;
  brand?: { name: string } | null;
}
interface Customer {
  id: number;
  code: string;
  name: string;
  businessName?: string | null;
  phone?: string | null;
  creditLimit: number;
}

function sanitizeQtyText(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const i = cleaned.indexOf(".");
  if (i === -1) return cleaned;
  return cleaned.slice(0, i + 1) + cleaned.slice(i + 1).replace(/\./g, "");
}

/** Human-readable qty for the cart field (no leading zero placeholder). */
function formatQtyForField(q: number): string {
  if (!Number.isFinite(q) || q < 0.001) return "";
  const rounded = Number(q.toFixed(6));
  return String(rounded);
}

/** Text `input` + numeric parsing: no number spinners, empty while editing clears display without showing "0". */
function CartQtyTextInput({ displayQty, onCommit }: { displayQty: number; onCommit: (q: number) => void }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => formatQtyForField(displayQty));

  useEffect(() => {
    if (!focused) {
      setDraft(formatQtyForField(displayQty));
    }
  }, [displayQty, focused]);

  const shown = focused ? draft : formatQtyForField(displayQty);

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={shown}
      onFocus={() => {
        setFocused(true);
        setDraft(formatQtyForField(displayQty));
      }}
      onChange={(e) => {
        const next = sanitizeQtyText(e.target.value);
        setDraft(next);
        const n = parseFloat(next);
        if (next !== "" && !Number.isNaN(n) && n >= 0.001) {
          onCommit(n);
        }
      }}
      onBlur={() => {
        setFocused(false);
        const n = parseFloat(draft);
        if (draft.trim() === "" || Number.isNaN(n) || n < 0.001) {
          onCommit(Math.max(0.001, displayQty));
        } else {
          onCommit(n);
        }
      }}
      className="w-14 text-center text-xs border-x py-0.5 focus:outline-none tabular-nums"
    />
  );
}

interface Props {
  products: Product[];
  customers: Customer[];
}

export function POSTerminal({ products, customers }: Props) {
  const { state, dispatch, subtotal, discountAmount, total, change, resto } = useCart();
  const [search, setSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastSale, setLastSale] = useState<unknown>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.brand?.name?.toLowerCase().includes(q) ?? false);
  });

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.businessName?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.toLowerCase().includes(q) ?? false)
    );
  });

  async function handleCheckout() {
    if (state.items.length === 0) return;
    setError("");
    setSaving(true);

    const payload = {
      customerId: state.customerId ?? undefined,
      items: state.items.map((i) => ({
        productId: i.productId,
        displayUnit: i.displayUnit,
        displayQty: i.displayQty,
        unitPriceKg: i.unitPriceKg,
        discount: i.discount,
      })),
      discountAmount,
      paymentMethod: state.paymentMethod,
      paidAmount: state.paidAmount,
      notes: state.notes,
    };

    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) {
      const sale = await res.json();
      setLastSale(sale);
      setShowReceipt(true);
    } else {
      const err = await res.json();
      setError(err.error ?? "Failed to complete sale");
    }
  }

  function handleNewSale() {
    dispatch({ type: "CLEAR_CART" });
    setShowReceipt(false);
    setLastSale(null);
    setSearch("");
  }

  async function handleShareReceiptImage() {
    if (!lastSale || !receiptRef.current) return;

    try {
      const sale = lastSale as ReceiptSale;
      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `receipt-${sale.invoiceNo}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Receipt ${sale.invoiceNo}`,
          text: `Sales receipt ${sale.invoiceNo}`,
          files: [file],
        });
        return;
      }

      // Fallback for browsers without file share support.
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `receipt-${sale.invoiceNo}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError("Unable to share receipt image. Please try Print.");
    }
  }

  if (showReceipt && lastSale) {
    return (
      <div className="flex flex-col h-full bg-gray-100">
        <div className="flex items-center gap-3 p-4 bg-white border-b">
          <div className="flex-1 flex items-center gap-2 text-green-600 font-semibold">
            <Check className="h-5 w-5" /> Sale Completed
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button onClick={handleShareReceiptImage} className="flex items-center gap-1.5 rounded bg-indigo-600 px-3 py-1.5 text-sm text-white">
            <Share2 className="h-4 w-4" /> Share Receipt
          </button>
          <button onClick={handleNewSale} className="rounded bg-green-600 px-3 py-1.5 text-sm text-white">
            New Sale
          </button>
        </div>
        <div
          ref={receiptRef}
          className="flex flex-1 justify-center overflow-y-auto bg-gray-100 p-4 print:justify-start print:bg-white print:p-0"
        >
          <SaleReceipt sale={lastSale as Parameters<typeof SaleReceipt>[0]["sale"]} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gray-100">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Cart */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          {/* Customer picker */}
          <div className="p-3 border-b relative">
            <input
              value={state.customerId ? state.customerName : customerSearch}
              onChange={(e) => {
                if (state.customerId) {
                  dispatch({ type: "SET_CUSTOMER", customerId: null, customerName: "" });
                }
                setCustomerSearch(e.target.value);
                setShowCustomerList(true);
              }}
              onFocus={() => setShowCustomerList(true)}
              placeholder="Search customer (or walk-in)..."
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {state.customerId && (
              <button onClick={() => dispatch({ type: "SET_CUSTOMER", customerId: null, customerName: "" })} className="absolute right-6 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
            {showCustomerList && !state.customerId && (
              <div className="absolute left-3 right-3 top-full mt-1 z-10 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredCustomers.map((c) => (
                  <button key={c.id} onClick={() => { dispatch({ type: "SET_CUSTOMER", customerId: c.id, customerName: c.name }); setShowCustomerList(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50">
                    <div className="flex justify-between">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-gray-400">{c.phone}</span>
                    </div>
                    {c.businessName ? (
                      <div className="text-xs text-gray-500">{c.businessName} &middot; {c.code}</div>
                    ) : (
                      <div className="text-xs text-gray-400">{c.code}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Product search dropdown */}
          <div className="border-b bg-gray-50 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowProductList(true); }}
                onFocus={() => { if (search) setShowProductList(true); }}
                onBlur={() => setTimeout(() => setShowProductList(false), 150)}
                placeholder="Search product by name, code, or brand…"
                className="w-full pl-9 pr-8 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button onClick={() => { setSearch(""); setShowProductList(false); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
              {showProductList && search && filtered.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded border bg-white shadow-lg">
                  {filtered.map((p) => {
                    const isOut = p.stockKg <= 0;
                    const isLow = p.stockKg <= p.lowStockThresholdKg;
                    return (
                      <button
                        key={p.id}
                        disabled={isOut}
                        onClick={() => {
                          dispatch({ type: "ADD_ITEM", product: { id: p.id, code: p.code, name: p.name, salePrice: p.salePrice, stockKg: p.stockKg, defaultUnit: p.defaultUnit as Unit } });
                          setSearch("");
                          setShowProductList(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">{p.name}</span>
                            {p.brand ? <span className="text-xs text-gray-400 truncate">{p.brand.name}</span> : null}
                          </div>
                          <span className="text-xs text-gray-400 font-mono">{p.code}</span>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold text-blue-600">{formatCurrency(p.salePrice)}</div>
                          <div className={`text-xs font-medium ${isOut ? "text-red-600" : isLow ? "text-yellow-600" : "text-green-600"}`}>
                            {isOut ? "OUT" : formatDisplay(p.stockKg, p.defaultUnit as Unit)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {showProductList && search && filtered.length === 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded border bg-white p-3 text-center text-sm text-gray-400 shadow-lg">
                  No products found
                </div>
              )}
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {state.items.length === 0 && (
              <div className="text-center text-sm text-gray-400 py-8">No items in cart.<br />Click a product to add.</div>
            )}
            {state.items.map((item) => (
              <div key={item.productId} className="rounded-md border border-gray-100 bg-gray-50 p-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-400">{item.productCode}</p>
                  </div>
                  <button onClick={() => dispatch({ type: "REMOVE_ITEM", productId: item.productId })} className="ml-2 text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center border rounded">
                    <button onClick={() => dispatch({ type: "UPDATE_QTY", productId: item.productId, displayQty: Math.max(0.001, item.displayQty - 1), unit: item.displayUnit })}
                      className="px-2 py-0.5 hover:bg-gray-100"><Minus className="h-3 w-3" /></button>
                    <CartQtyTextInput
                      displayQty={item.displayQty}
                      onCommit={(displayQty) => dispatch({ type: "UPDATE_QTY", productId: item.productId, displayQty, unit: item.displayUnit })}
                    />
                    <button onClick={() => dispatch({ type: "UPDATE_QTY", productId: item.productId, displayQty: item.displayQty + 1, unit: item.displayUnit })}
                      className="px-2 py-0.5 hover:bg-gray-100"><Plus className="h-3 w-3" /></button>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={item.unitPriceKg || ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, "");
                      dispatch({ type: "SET_ITEM_RATE", productId: item.productId, rate: Math.max(0, Number(v) || 0) });
                    }}
                    placeholder="0"
                    className="w-24 rounded border px-2 py-1 text-xs text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-gray-500">@ {formatCurrency(item.unitPriceKg)}/unit</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.lineTotal)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Discount Amount</span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={state.globalDiscount || ""}
                onFocus={(e) => { if (Number(e.target.value) === 0) e.target.value = ""; }}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d.]/g, "");
                  dispatch({ type: "SET_GLOBAL_DISCOUNT", discount: Number(v) || 0 });
                }}
                placeholder="0"
                className="w-24 rounded border px-2 py-0.5 text-xs text-right tabular-nums"
              />
              <span className="ml-auto text-sm text-red-500">-{formatCurrency(discountAmount)}</span>
            </div>

            <div className="flex justify-between border-t pt-2">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-lg font-bold text-blue-700">{formatCurrency(total)}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex gap-1">
                {(["CASH", "CREDIT", "BANK_TRANSFER"] as const).map((m) => {
                  const label = m === "BANK_TRANSFER" ? "BANK" : m === "CREDIT" ? "RESTO" : m;
                  return (
                    <button key={m} onClick={() => dispatch({ type: "SET_PAYMENT_METHOD", method: m })}
                      className={`flex-1 rounded py-1 text-xs font-medium border ${state.paymentMethod === m ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Received</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={state.paidAmount || ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.]/g, "");
                    dispatch({ type: "SET_PAID_AMOUNT", amount: Number(v) || 0 });
                  }}
                  placeholder={formatCurrency(total)}
                  className="flex-1 rounded border px-2 py-1 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {resto > 0 && (
                <div className="flex justify-between text-sm font-medium text-orange-700 bg-orange-50 rounded px-2 py-1">
                  <span>Resto</span><span>{formatCurrency(resto)}</span>
                </div>
              )}
              {change > 0 && (
                <div className="flex justify-between text-sm font-medium text-green-700 bg-green-50 rounded px-2 py-1">
                  <span>Change</span><span>{formatCurrency(change)}</span>
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>}

            <button
              onClick={handleCheckout}
              disabled={saving || state.items.length === 0}
              className="w-full rounded-lg bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Processing..." : `COMPLETE SALE — ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
