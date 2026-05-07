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
  name: string;
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
  const { state, dispatch, subtotal, discountAmount, total, change } = useCart();
  const [search, setSearch] = useState("");
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

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

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
        backgroundColor: "#f3f4f6",
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
        <div ref={receiptRef} className="flex-1 overflow-y-auto p-4">
          <SaleReceipt sale={lastSale as Parameters<typeof SaleReceipt>[0]["sale"]} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gray-100">
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Left: Product search + grid */}
        <div className="flex min-h-0 flex-col overflow-hidden md:flex-1">
          <div className="bg-white border-b p-3 flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, code, or brand…"
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} items</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 content-start">
            {filtered.map((p) => {
              const isLow = p.stockKg <= p.lowStockThresholdKg;
              const isOut = p.stockKg <= 0;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    dispatch({ type: "ADD_ITEM", product: { id: p.id, code: p.code, name: p.name, salePrice: p.salePrice, stockKg: p.stockKg, defaultUnit: p.defaultUnit as Unit } });
                  }}
                  disabled={isOut}
                  className={`rounded-lg border bg-white p-3 text-left shadow-sm hover:border-blue-400 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isOut ? "border-red-200" : isLow ? "border-yellow-300" : "border-gray-200"}`}
                >
                  <p className="text-xs text-gray-400 font-mono">{p.code}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 leading-tight">{p.name}</p>
                  {p.brand ? <p className="text-xs text-gray-500 truncate">{p.brand.name}</p> : null}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-600">{formatCurrency(p.salePrice)}<span className="text-xs font-normal text-gray-400">/unit</span></span>
                    <span className={`text-xs font-medium ${isOut ? "text-red-600" : isLow ? "text-yellow-600" : "text-green-600"}`}>
                      {isOut ? "OUT" : formatDisplay(p.stockKg, p.defaultUnit as Unit)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="flex max-h-[50vh] min-h-0 flex-col overflow-hidden border-t bg-white md:max-h-none md:w-96 md:flex-none md:border-l md:border-t-0">
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
                    className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex justify-between">
                    <span>{c.name}</span>
                    <span className="text-xs text-gray-400">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
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
                    type="number"
                    min={0}
                    value={item.unitPriceKg}
                    onChange={(e) => dispatch({ type: "SET_ITEM_RATE", productId: item.productId, rate: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-24 rounded border px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <input type="number" min={0} value={state.globalDiscount}
                onChange={(e) => dispatch({ type: "SET_GLOBAL_DISCOUNT", discount: Number(e.target.value) })}
                className="w-24 rounded border px-2 py-0.5 text-xs text-right" />
              <span className="ml-auto text-sm text-red-500">-{formatCurrency(discountAmount)}</span>
            </div>

            <div className="flex justify-between border-t pt-2">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-lg font-bold text-blue-700">{formatCurrency(total)}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex gap-1">
                {(["CASH", "CREDIT", "BANK_TRANSFER"] as const).map((m) => (
                  <button key={m} onClick={() => dispatch({ type: "SET_PAYMENT_METHOD", method: m })}
                    className={`flex-1 rounded py-1 text-xs font-medium border ${state.paymentMethod === m ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>
                    {m === "BANK_TRANSFER" ? "BANK" : m}
                  </button>
                ))}
              </div>

              {state.paymentMethod !== "CREDIT" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Received</span>
                  <input type="number" value={state.paidAmount || ""}
                    onChange={(e) => dispatch({ type: "SET_PAID_AMOUNT", amount: Number(e.target.value) })}
                    placeholder={formatCurrency(total)}
                    className="flex-1 rounded border px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
